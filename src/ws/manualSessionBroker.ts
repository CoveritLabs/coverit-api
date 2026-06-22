// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { Server as HttpServer, IncomingMessage } from "http";
import type { Duplex } from "stream";

import {
  ManualSessionDisconnectReason,
  ManualSessionSocketMessageType,
  ManualSessionStatus,
  type ManualSessionSocketMessage as ContractManualSessionSocketMessage,
} from "@coveritlabs/contracts";
import WebSocket, { WebSocketServer } from "ws";

import { env } from "@config/env";
import type { Plain } from "@models/common";
import { consumeManualSessionTicket } from "@services/manualSession.service";

type ClientRole = "frontend" | "crawler";

type SessionSockets = {
  frontend?: WebSocket;
  crawler?: WebSocket;
  crawlerReady?: boolean;
  frontendDisconnectedBeforeCrawler?: boolean;
  cleanupTimer?: ReturnType<typeof setTimeout>;
};

const MANUAL_SESSION_SOCKET_MESSAGE_TYPES = {
  "browser.input": ManualSessionSocketMessageType.BROWSER_INPUT,
  "flow.start": ManualSessionSocketMessageType.FLOW_START,
  "flow.finish": ManualSessionSocketMessageType.UNSPECIFIED,
  "flow.rewind": ManualSessionSocketMessageType.UNSPECIFIED,
  "bug.report": ManualSessionSocketMessageType.UNSPECIFIED,
  "session.disconnect": ManualSessionSocketMessageType.SESSION_DISCONNECT,
  "crawler.ready": ManualSessionSocketMessageType.CRAWLER_READY,
  "session.status": ManualSessionSocketMessageType.SESSION_STATUS,
  "browser.frame": ManualSessionSocketMessageType.BROWSER_FRAME,
  "browser.navigation": ManualSessionSocketMessageType.BROWSER_NAVIGATION,
  "recorded.event": ManualSessionSocketMessageType.RECORDED_EVENT,
  "recorded.step": ManualSessionSocketMessageType.UNSPECIFIED,
  "flow.started": ManualSessionSocketMessageType.FLOW_STARTED,
  "flow.completed": ManualSessionSocketMessageType.UNSPECIFIED,
  "flow.rewound": ManualSessionSocketMessageType.UNSPECIFIED,
  "bug.reported": ManualSessionSocketMessageType.UNSPECIFIED,
  "session.closed": ManualSessionSocketMessageType.SESSION_CLOSED,
  error: ManualSessionSocketMessageType.ERROR,
} as const;

const MANUAL_SESSION_STATUSES = {
  frontend_connected: ManualSessionStatus.FRONTEND_CONNECTED,
  crawler_connected: ManualSessionStatus.CRAWLER_CONNECTED,
  disconnect_pending: ManualSessionStatus.DISCONNECT_PENDING,
  crawler_disconnected: ManualSessionStatus.CRAWLER_DISCONNECTED,
} as const;

const MANUAL_SESSION_DISCONNECT_REASONS = {
  frontend_disconnected: ManualSessionDisconnectReason.FRONTEND_DISCONNECTED,
  frontend_disconnected_before_ready: ManualSessionDisconnectReason.FRONTEND_DISCONNECTED_BEFORE_READY,
} as const;

type ManualSessionSocketMessageContract = Plain<ContractManualSessionSocketMessage>;
type ManualSessionSocketMessageName = keyof typeof MANUAL_SESSION_SOCKET_MESSAGE_TYPES;
type ManualSessionStatusName = keyof typeof MANUAL_SESSION_STATUSES;
type ManualSessionDisconnectReasonName = keyof typeof MANUAL_SESSION_DISCONNECT_REASONS;

type WsMessage = Omit<ManualSessionSocketMessageContract, "type" | "status" | "reason" | "payload"> & {
  type?: ManualSessionSocketMessageName | string;
  status?: ManualSessionStatusName | string;
  reason?: ManualSessionDisconnectReasonName | string;
  [key: string]: unknown;
};

const FRONTEND_MESSAGE_TYPES = new Set<ManualSessionSocketMessageName>([
  "browser.input",
  "flow.start",
  "flow.finish",
  "flow.rewind",
  "bug.report",
  "session.disconnect",
]);
const CRAWLER_MESSAGE_TYPES = new Set<ManualSessionSocketMessageName>([
  "crawler.ready",
  "session.status",
  "browser.frame",
  "browser.navigation",
  "recorded.event",
  "recorded.step",
  "flow.started",
  "flow.completed",
  "flow.rewound",
  "bug.reported",
  "session.closed",
  "error",
]);

const sessions = new Map<string, SessionSockets>();

function apiPath(path: string): string {
  const prefix = env.API_PREFIX.replace(/\/$/, "");
  return `${prefix}${path}`;
}

function send(ws: WebSocket | undefined, payload: WsMessage): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function isManualSessionSocketMessageName(type: string): type is ManualSessionSocketMessageName {
  return type in MANUAL_SESSION_SOCKET_MESSAGE_TYPES;
}

function getSessionSockets(sessionId: string): SessionSockets {
  let sockets = sessions.get(sessionId);
  if (!sockets) {
    sockets = {};
    sessions.set(sessionId, sockets);
  }
  return sockets;
}

function cleanupSessionIfEmpty(sessionId: string): void {
  const sockets = sessions.get(sessionId);
  if (!sockets?.frontend && !sockets?.crawler) {
    if (sockets?.frontendDisconnectedBeforeCrawler) {
      sockets.cleanupTimer ??= setTimeout(() => {
        sessions.delete(sessionId);
      }, 120_000);
      return;
    }
    sessions.delete(sessionId);
  }
}

function rejectUpgrade(socket: Duplex, statusCode: number, message: string): void {
  socket.write(`HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function parseJson(raw: WebSocket.RawData): WsMessage | null {
  try {
    const parsed = JSON.parse(raw.toString()) as WsMessage;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function sessionIdFromPath(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const value = decodeURIComponent(pathname.slice(prefix.length).replace(/^\/+/, ""));
  return value || null;
}

function attachSocket(sessionId: string, role: ClientRole, ws: WebSocket): void {
  const sockets = getSessionSockets(sessionId);
  if (sockets.cleanupTimer) {
    clearTimeout(sockets.cleanupTimer);
    sockets.cleanupTimer = undefined;
  }

  const previous = sockets[role];
  if (previous && previous.readyState === WebSocket.OPEN) {
    previous.close(1000, "Replaced by a new connection");
  }

  sockets[role] = ws;
  if (role === "crawler") {
    sockets.crawlerReady = false;
  } else {
    sockets.frontendDisconnectedBeforeCrawler = false;
  }

  send(sockets.frontend, {
    type: "session.status",
    status: role === "crawler" ? "crawler_connected" : "frontend_connected",
  });

  if (role === "crawler" && sockets.frontendDisconnectedBeforeCrawler && !sockets.frontend) {
    send(ws, {
      type: "session.disconnect",
      reason: "frontend_disconnected_before_ready",
    });
  }

  ws.on("message", (raw) => {
    const message = parseJson(raw);
    if (!message?.type || !isManualSessionSocketMessageName(message.type)) {
      send(ws, { type: "error", message: "Invalid WebSocket message" });
      return;
    }

    const current = getSessionSockets(sessionId);
    if (role === "frontend") {
      if (!FRONTEND_MESSAGE_TYPES.has(message.type)) {
        send(ws, { type: "error", message: `Unsupported frontend message type: ${message.type}` });
        return;
      }

      if (!current.crawler || current.crawler.readyState !== WebSocket.OPEN) {
        if (message.type === "session.disconnect") {
          current.frontendDisconnectedBeforeCrawler = true;
          send(ws, { type: "session.status", status: "disconnect_pending" });
          ws.close(1000, "Manual recording disconnected before crawler was ready");
          return;
        }

        send(ws, { type: "error", message: "Crawler is not connected yet" });
        return;
      }

      send(current.crawler, message);
      return;
    }

    if (message.type === "crawler.ready") {
      current.crawlerReady = true;
    }

    if (
      !CRAWLER_MESSAGE_TYPES.has(message.type)
    ) {
      return;
    }

    send(current.frontend, message);
  });

  ws.on("close", () => {
    const current = getSessionSockets(sessionId);
    if (current[role] === ws) {
      current[role] = undefined;
    }

    if (role === "frontend") {
      const crawlerReady = current.crawlerReady === true;
      if (!crawlerReady) {
        current.frontendDisconnectedBeforeCrawler = true;
      }
      send(current.crawler, {
        type: "session.disconnect",
        reason: crawlerReady ? "frontend_disconnected" : "frontend_disconnected_before_ready",
      });
    } else {
      current.crawlerReady = false;
      current.frontendDisconnectedBeforeCrawler = false;
      send(current.frontend, { type: "session.status", status: "crawler_disconnected" });
    }

    cleanupSessionIfEmpty(sessionId);
  });
}

async function validateFrontendUpgrade(pathname: string, requestUrl: URL): Promise<string | null> {
  const sessionId = sessionIdFromPath(pathname, apiPath("/ws/manual-recordings/"));
  if (!sessionId) return null;

  const ticket = requestUrl.searchParams.get("ticket");
  if (!ticket) {
    throw new Error("Missing manual recording ticket");
  }

  await consumeManualSessionTicket(sessionId, ticket);
  return sessionId;
}

function validateCrawlerUpgrade(pathname: string, req: IncomingMessage): string | null {
  const sessionId = sessionIdFromPath(pathname, apiPath("/internal/ws/manual-recordings/"));
  if (!sessionId) return null;

  const token = req.headers["x-coverit-internal-token"];
  if (!env.INTERNAL_SERVICE_TOKEN || token !== env.INTERNAL_SERVICE_TOKEN) {
    throw new Error("Invalid internal service token");
  }

  return sessionId;
}

export function setupManualSessionWebSockets(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const pathname = requestUrl.pathname;

    let role: ClientRole | null = null;
    let sessionId: string | null = null;

    try {
      sessionId = await validateFrontendUpgrade(pathname, requestUrl);
      if (sessionId) {
        role = "frontend";
      } else {
        sessionId = validateCrawlerUpgrade(pathname, req);
        if (sessionId) {
          role = "crawler";
        }
      }
    } catch {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }

    if (!sessionId || !role) {
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      attachSocket(sessionId, role, ws);
    });
  });
}
