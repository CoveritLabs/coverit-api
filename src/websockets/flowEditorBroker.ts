// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { Server as HttpServer, IncomingMessage } from "http";
import type { Duplex } from "stream";

import WebSocket, { WebSocketServer } from "ws";

import { env } from "@config/env";
import { consumeFlowEditorTicket } from "@services/testFlow.service";

type ClientRole = "frontend" | "crawler";

type SessionSockets = {
  frontend?: WebSocket;
  crawler?: WebSocket;
  crawlerReady?: boolean;
  frontendDisconnectedBeforeCrawler?: boolean;
  cleanupTimer?: ReturnType<typeof setTimeout>;
};

type WsMessage = {
  type?: string;
  message?: string;
  reason?: string;
  [key: string]: unknown;
};

const FRONTEND_MESSAGE_TYPES = new Set([
  "editor.open_position",
  "inspector.hover",
  "inspector.pick",
  "viewport.scroll",
  "session.disconnect",
]);

const CRAWLER_MESSAGE_TYPES = new Set([
  "editor.ready",
  "position.ready",
  "browser.frame",
  "inspector.hovered",
  "inspector.selected",
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

function getSessionSockets(editorSessionId: string): SessionSockets {
  let sockets = sessions.get(editorSessionId);
  if (!sockets) {
    sockets = {};
    sessions.set(editorSessionId, sockets);
  }
  return sockets;
}

function cleanupSessionIfEmpty(editorSessionId: string): void {
  const sockets = sessions.get(editorSessionId);
  if (!sockets?.frontend && !sockets?.crawler) {
    if (sockets?.frontendDisconnectedBeforeCrawler) {
      sockets.cleanupTimer ??= setTimeout(() => sessions.delete(editorSessionId), 120_000);
      return;
    }
    sessions.delete(editorSessionId);
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

function isManualSessionPath(pathname: string): boolean {
  return (
    pathname.startsWith(apiPath("/ws/manual-recordings/")) ||
    pathname.startsWith(apiPath("/internal/ws/manual-recordings/"))
  );
}

function attachSocket(editorSessionId: string, role: ClientRole, ws: WebSocket): void {
  const sockets = getSessionSockets(editorSessionId);
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

  if (role === "crawler" && sockets.frontendDisconnectedBeforeCrawler && !sockets.frontend) {
    send(ws, {
      type: "session.disconnect",
      reason: "frontend_disconnected_before_ready",
    });
  }

  ws.on("message", (raw) => {
    const message = parseJson(raw);
    if (!message?.type) {
      send(ws, { type: "error", message: "Invalid WebSocket message" });
      return;
    }

    const current = getSessionSockets(editorSessionId);
    if (role === "frontend") {
      if (!FRONTEND_MESSAGE_TYPES.has(message.type)) {
        send(ws, { type: "error", message: `Unsupported frontend message type: ${message.type}` });
        return;
      }

      if (!current.crawler || current.crawler.readyState !== WebSocket.OPEN) {
        if (message.type === "session.disconnect") {
          current.frontendDisconnectedBeforeCrawler = true;
          ws.close(1000, "Flow editor disconnected before crawler was ready");
          return;
        }

        send(ws, { type: "error", message: "Crawler is not connected yet" });
        return;
      }

      send(current.crawler, message);
      return;
    }

    if (message.type === "editor.ready") {
      current.crawlerReady = true;
    }

    if (!CRAWLER_MESSAGE_TYPES.has(message.type)) {
      return;
    }

    send(current.frontend, message);
  });

  ws.on("close", () => {
    const current = getSessionSockets(editorSessionId);
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
      send(current.frontend, { type: "session.closed", status: "crawler_disconnected" });
    }

    cleanupSessionIfEmpty(editorSessionId);
  });
}

async function validateFrontendUpgrade(pathname: string, requestUrl: URL): Promise<string | null> {
  const editorSessionId = sessionIdFromPath(pathname, apiPath("/ws/flow-editors/"));
  if (!editorSessionId) return null;

  const ticket = requestUrl.searchParams.get("ticket");
  if (!ticket) {
    throw new Error("Missing flow editor ticket");
  }

  await consumeFlowEditorTicket(editorSessionId, ticket);
  return editorSessionId;
}

function validateCrawlerUpgrade(pathname: string, req: IncomingMessage): string | null {
  const editorSessionId = sessionIdFromPath(pathname, apiPath("/internal/ws/flow-editors/"));
  if (!editorSessionId) return null;

  const token = req.headers["x-coverit-internal-token"];
  if (!env.INTERNAL_SERVICE_TOKEN || token !== env.INTERNAL_SERVICE_TOKEN) {
    throw new Error("Invalid internal service token");
  }

  return editorSessionId;
}

export function setupFlowEditorWebSockets(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const pathname = requestUrl.pathname;

    let role: ClientRole | null = null;
    let editorSessionId: string | null = null;

    try {
      editorSessionId = await validateFrontendUpgrade(pathname, requestUrl);
      if (editorSessionId) {
        role = "frontend";
      } else {
        editorSessionId = validateCrawlerUpgrade(pathname, req);
        if (editorSessionId) {
          role = "crawler";
        }
      }
    } catch {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }

    if (!editorSessionId || !role) {
      if (!isManualSessionPath(pathname)) {
        rejectUpgrade(socket, 404, "Not Found");
      }
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      attachSocket(editorSessionId as string, role as ClientRole, ws);
    });
  });
}
