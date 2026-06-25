// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { randomUUID } from "crypto";

import { CrawlStatus as PrismaCrawlStatus, CrawlTriggerType as PrismaCrawlTriggerType } from "@generated/prisma/client";
import { DEFAULT_CRAWL_CONFIG } from "@constants/crawlConfig";
import { CRAWL_SESSION_MESSAGES, MANUAL_SESSION_MESSAGES, TARGET_APPLICATION_VALIDATION } from "@constants/messages";
import type { ManualSessionConnectResponse } from "@models/manualSession";
import { env } from "@config/env";
import redis from "@lib/redis";
import prisma from "@lib/prisma";
import { cacheKeys } from "@lib/cache";
import { toPersistedCrawlConfig } from "@mappers/crawlSession.mapper";
import { CrawlConfigSchema } from "@models/crawlSession";
import { addManualSessionJob } from "@queues/crawl.queue";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "@utils/errors";

type TicketPayload = {
  sessionId: string;
  userId: string;
};

async function requireTargetApplication(projectId: string, appId: string) {
  const app = await prisma.targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) {
    throw new NotFoundError(CRAWL_SESSION_MESSAGES.APPLICATION_NOT_FOUND);
  }
  return app;
}

async function requireApplicationVersion(appId: string, versionId: string) {
  const version = await prisma.targetApplicationVersion.findFirst({
    where: { id: versionId, targetApplicationId: appId },
  });
  if (!version) {
    throw new NotFoundError(CRAWL_SESSION_MESSAGES.VERSION_NOT_FOUND);
  }
  return version;
}

async function issueTicket(sessionId: string, userId: string): Promise<string> {
  const ticket = randomUUID();
  const payload: TicketPayload = { sessionId, userId };
  await redis.set(cacheKeys.manualSession.ticket(ticket), JSON.stringify(payload), "EX", env.MANUAL_SESSION_TICKET_TTL_SECONDS);
  return ticket;
}

export async function consumeManualSessionTicket(sessionId: string, ticket: string): Promise<TicketPayload> {
  const key = cacheKeys.manualSession.ticket(ticket);
  const raw = await redis.get(key);
  if (!raw) {
    throw new UnauthorizedError(MANUAL_SESSION_MESSAGES.INVALID_TICKET);
  }

  await redis.del(key);

  const parsed = JSON.parse(raw) as TicketPayload;
  if (parsed.sessionId !== sessionId) {
    throw new UnauthorizedError(MANUAL_SESSION_MESSAGES.INVALID_TICKET_SESSION_ID);
  }

  return parsed;
}

export async function createManualSession(
  projectId: string,
  appId: string,
  versionId: string,
  userId: string,
): Promise<ManualSessionConnectResponse> {
  const app = await requireTargetApplication(projectId, appId);
  await requireApplicationVersion(appId, versionId);

  if (!app.baseUrl) {
    throw new BadRequestError(TARGET_APPLICATION_VALIDATION.BASE_URL_REQUIRED);
  }

  const crawlConfig = CrawlConfigSchema.parse({ ...DEFAULT_CRAWL_CONFIG });
  const session = await prisma.crawlSession.create({
    data: {
      appVersionId: versionId,
      creatorUserId: userId,
      status: PrismaCrawlStatus.QUEUED,
      triggerType: PrismaCrawlTriggerType.MANUAL,
      config: toPersistedCrawlConfig(crawlConfig),
      baseUrlSnapshot: app.baseUrl,
    },
  });

  try {
    await addManualSessionJob(session.id);
  } catch (error) {
    await prisma.crawlSession.update({
      where: { id: session.id },
      data: {
        status: PrismaCrawlStatus.FAILED,
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }

  return {
    sessionId: session.id,
    wsTicket: await issueTicket(session.id, userId),
  };
}

export async function reattachManualSession(
  projectId: string,
  appId: string,
  versionId: string,
  sessionId: string,
  userId: string,
): Promise<ManualSessionConnectResponse> {
  await requireTargetApplication(projectId, appId);
  await requireApplicationVersion(appId, versionId);

  const session = await prisma.crawlSession.findFirst({
    where: {
      id: sessionId,
      appVersionId: versionId,
    },
    select: {
      id: true,
      status: true,
      triggerType: true,
    },
  });

  if (!session) {
    throw new NotFoundError(MANUAL_SESSION_MESSAGES.SESSION_NOT_FOUND);
  }

  if (session.triggerType !== PrismaCrawlTriggerType.MANUAL) {
    throw new ConflictError(MANUAL_SESSION_MESSAGES.SESSION_NOT_MANUAL);
  }

  if (
    session.status !== PrismaCrawlStatus.NEW &&
    session.status !== PrismaCrawlStatus.QUEUED &&
    session.status !== PrismaCrawlStatus.RUNNING &&
    session.status !== PrismaCrawlStatus.PAUSED
  ) {
    throw new ConflictError(MANUAL_SESSION_MESSAGES.SESSION_NOT_ACTIVE);
  }

  return {
    sessionId: session.id,
    wsTicket: await issueTicket(session.id, userId),
  };
}
