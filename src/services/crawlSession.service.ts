// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { CrawlStatus as PrismaCrawlStatus, CrawlTriggerType as PrismaCrawlTriggerType } from "@generated/prisma/client";
import {
  fromDbCrawlStatus,
  fromDbCrawlTriggerType,
  fromPersistedCrawlConfig,
  toDbCrawlStatusFilter,
  toDbCrawlTriggerType,
  toDbCrawlTriggerTypeFilter,
  toPersistedCrawlConfig,
} from "@mappers/crawlSession.mapper";
import { DEFAULT_CRAWL_CONFIG } from "@constants/crawlConfig";
import { CRAWL_SESSION_MESSAGES, TARGET_APPLICATION_VALIDATION } from "@constants/messages";
import { BadRequestError, ConflictError, NotFoundError } from "@utils/errors";
import type { MessageResponse } from "@models/common";
import {
  CrawlConfigSchema,
  CodegenConfigSchema,
  type ApplicationVersionCrawlSessionsResponse,
  CrawlTriggerType,
  type CrawlSessionData,
  type GetSessionsQuery,
  type CreateCrawlSessionRequest,
} from "@models/crawlSession";
import { removeCrawlJob, addCrawlJob } from "@queues/crawl.queue";
import { toIso } from "@utils/date";

type DbCrawlSession = Awaited<ReturnType<typeof prisma.crawlSession.findFirstOrThrow>>;
type DbCrawlStatus = DbCrawlSession["status"];
type DbCrawlTriggerType = DbCrawlSession["triggerType"];

const mapSession = (session: DbCrawlSession): CrawlSessionData => ({
  id: session.id,
  appVersionId: session.appVersionId,
  status: fromDbCrawlStatus(session.status),
  triggerType: fromDbCrawlTriggerType(session.triggerType),

  crawlConfig: (() => {
    const parsed = CrawlConfigSchema.safeParse(fromPersistedCrawlConfig(session.config, { ...DEFAULT_CRAWL_CONFIG }));
    return parsed.success ? parsed.data : { ...DEFAULT_CRAWL_CONFIG };
  })(),

  codegenConfig: (() => {
    const parsed = CodegenConfigSchema.safeParse(session.codegenConfig);
    return parsed.success ? parsed.data : undefined;
  })(),

  regressionCodebaseId: session.regressionCodebaseId ?? undefined,
  baseUrlSnapshot: session.baseUrlSnapshot ?? undefined,
  scheduleId: session.scheduleId ?? undefined,
  stateCount: session.stateCount,
  transitionCount: session.transitionCount,
  createdAt: session.createdAt.toISOString(),
  startedAt: toIso(session.startedAt),
  finishedAt: toIso(session.finishedAt),
  errorMessage: session.error ?? undefined,
});

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

async function requireRegressionCodebase(appId: string, regressionCodebaseId: string) {
  const codebase = await prisma.regressionCodebase.findUnique({ where: { id: regressionCodebaseId } });
  if (!codebase || codebase.targetApplicationId !== appId) {
    throw new NotFoundError(CRAWL_SESSION_MESSAGES.CODEBASE_NOT_FOUND);
  }
  return codebase;
}

export async function getSessions(
  projectId: string,
  appId: string,
  versionId: string,
  query: GetSessionsQuery,
): Promise<ApplicationVersionCrawlSessionsResponse> {
  await requireTargetApplication(projectId, appId);
  await requireApplicationVersion(appId, versionId);

  const { page, pageSize, status, triggerType } = query;
  const dbStatus = toDbCrawlStatusFilter<DbCrawlStatus>(status);
  const dbTriggerType = toDbCrawlTriggerTypeFilter<DbCrawlTriggerType>(triggerType);
  const [sessions, totalCount] = await Promise.all([
    prisma.crawlSession.findMany({
      where: {
        appVersionId: versionId,
        status: dbStatus,
        triggerType: dbTriggerType,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.crawlSession.count({
      where: {
        appVersionId: versionId,
        status: dbStatus,
        triggerType: dbTriggerType,
      },
    }),
  ]);

  return {
    sessions: sessions.map(mapSession),
    totalCount: totalCount,
    currentPage: page,
    pageSize: pageSize,
  };
}

export async function createSession(
  projectId: string,
  appId: string,
  versionId: string,
  creatorUserId: string,
  input: CreateCrawlSessionRequest,
): Promise<CrawlSessionData> {
  const app = await requireTargetApplication(projectId, appId);
  await requireApplicationVersion(appId, versionId);

  if (input.regressionCodebaseId) {
    await requireRegressionCodebase(appId, input.regressionCodebaseId);
  }

  if (!app.baseUrl) {
    throw new BadRequestError(TARGET_APPLICATION_VALIDATION.BASE_URL_REQUIRED);
  }

  if (input.triggerType === CrawlTriggerType.MANUAL) {
    throw new BadRequestError(CRAWL_SESSION_MESSAGES.MANUAL_TRIGGER_NOT_ALLOWED);
  }

  const parsedConfig = CrawlConfigSchema.parse(input.crawlConfig ?? { ...DEFAULT_CRAWL_CONFIG });
  const persistedConfig = toPersistedCrawlConfig(parsedConfig);

  const newSession = await prisma.crawlSession.create({
    data: {
      appVersionId: versionId,
      creatorUserId,
      triggerType: toDbCrawlTriggerType(input.triggerType) as unknown as DbCrawlTriggerType,
      config: persistedConfig,
      regressionCodebaseId: input.regressionCodebaseId ?? null,

      codegenConfig: input.codegenConfig
        ? {
            codegenBranch: input.codegenConfig.codegenBranch,
            prTargetBranch: input.codegenConfig.prTargetBranch,
            prTitle: input.codegenConfig.prTitle,
            prBody: input.codegenConfig.prBody,
            prDraft: input.codegenConfig.prDraft,
          }
        : undefined,

      baseUrlSnapshot: app.baseUrl,
    },
  });
  return mapSession(newSession);
}

export async function getSessionDetails(projectId: string, appId: string, versionId: string, sessionId: string): Promise<CrawlSessionData> {
  await requireTargetApplication(projectId, appId);
  await requireApplicationVersion(appId, versionId);

  const session = await prisma.crawlSession.findFirst({
    where: {
      id: sessionId,
      appVersionId: versionId,
    },
  });
  if (!session) throw new NotFoundError(CRAWL_SESSION_MESSAGES.NOT_FOUND);
  return mapSession(session);
}

export async function deleteSession(projectId: string, appId: string, versionId: string, sessionId: string): Promise<MessageResponse> {
  await requireTargetApplication(projectId, appId);
  await requireApplicationVersion(appId, versionId);

  const session = await prisma.crawlSession.findFirst({
    where: { id: sessionId, appVersionId: versionId },
  });
  if (!session) throw new NotFoundError(CRAWL_SESSION_MESSAGES.NOT_FOUND);

  if (
    session.status === PrismaCrawlStatus.RUNNING ||
    session.status === PrismaCrawlStatus.PAUSED ||
    session.status === PrismaCrawlStatus.QUEUED ||
    session.status === PrismaCrawlStatus.NEW
  ) {
    await removeCrawlJob(sessionId);
    await prisma.crawlSession.update({
      where: { id: sessionId },
      data: { status: PrismaCrawlStatus.ABORTED, finishedAt: new Date() },
    });
    return { message: CRAWL_SESSION_MESSAGES.ABORTED_DELETE_SUCCESS };
  }

  await prisma.crawlSession.delete({ where: { id: sessionId } });
  return { message: CRAWL_SESSION_MESSAGES.DELETE_SUCCESS };
}

export async function startSession(projectId: string, appId: string, versionId: string, sessionId: string): Promise<MessageResponse> {
  await requireTargetApplication(projectId, appId);
  await requireApplicationVersion(appId, versionId);

  const session = await prisma.crawlSession.findFirst({
    where: { id: sessionId, appVersionId: versionId },
  });
  if (!session) throw new NotFoundError(CRAWL_SESSION_MESSAGES.NOT_FOUND);

  if (session.triggerType === PrismaCrawlTriggerType.MANUAL) {
    throw new ConflictError(CRAWL_SESSION_MESSAGES.MANUAL_TRIGGER_NOT_ALLOWED);
  }

  if (session.status === PrismaCrawlStatus.NEW) {
    const queued = await prisma.crawlSession.updateMany({
      where: { id: sessionId, status: PrismaCrawlStatus.NEW },
      data: { status: PrismaCrawlStatus.QUEUED, finishedAt: null, error: null },
    });

    if (queued.count !== 1) {
      return { message: CRAWL_SESSION_MESSAGES.ALREADY_STARTED };
    }

    try {
      await addCrawlJob(sessionId);
    } catch (error) {
      await prisma.crawlSession.updateMany({
        where: { id: sessionId, status: PrismaCrawlStatus.QUEUED },
        data: { status: PrismaCrawlStatus.NEW },
      });
      throw error;
    }

    return { message: CRAWL_SESSION_MESSAGES.STARTED };
  }

  if (session.status === PrismaCrawlStatus.PAUSED) {
    const resumed = await prisma.crawlSession.updateMany({
      where: { id: sessionId, status: PrismaCrawlStatus.PAUSED },
      data: { status: PrismaCrawlStatus.RUNNING, finishedAt: null, error: null },
    });

    if (resumed.count !== 1) {
      return { message: CRAWL_SESSION_MESSAGES.ALREADY_STARTED };
    }

    try {
      await addCrawlJob(sessionId);
    } catch (error) {
      await prisma.crawlSession.updateMany({
        where: { id: sessionId, status: PrismaCrawlStatus.RUNNING },
        data: { status: PrismaCrawlStatus.PAUSED },
      });
      throw error;
    }

    return { message: CRAWL_SESSION_MESSAGES.RESUMED };
  }

  if (session.status === PrismaCrawlStatus.QUEUED || session.status === PrismaCrawlStatus.RUNNING) {
    return { message: CRAWL_SESSION_MESSAGES.ALREADY_STARTED };
  }

  throw new ConflictError(CRAWL_SESSION_MESSAGES.INVALID_STATUS);
}

export async function abortSession(projectId: string, appId: string, versionId: string, sessionId: string): Promise<MessageResponse> {
  await requireTargetApplication(projectId, appId);
  await requireApplicationVersion(appId, versionId);

  const session = await prisma.crawlSession.findFirst({
    where: { id: sessionId, appVersionId: versionId },
  });
  if (!session) throw new NotFoundError(CRAWL_SESSION_MESSAGES.NOT_FOUND);

  if (session.status === PrismaCrawlStatus.ABORTED) {
    return { message: CRAWL_SESSION_MESSAGES.ALREADY_ABORTED };
  }

  if (
    session.status !== PrismaCrawlStatus.RUNNING &&
    session.status !== PrismaCrawlStatus.PAUSED &&
    session.status !== PrismaCrawlStatus.QUEUED &&
    session.status !== PrismaCrawlStatus.NEW
  ) {
    throw new ConflictError(CRAWL_SESSION_MESSAGES.INVALID_STATUS);
  }

  await prisma.crawlSession.update({
    where: { id: sessionId },
    data: { status: PrismaCrawlStatus.ABORTED, finishedAt: new Date() },
  });

  if (
    session.status === PrismaCrawlStatus.QUEUED ||
    session.status === PrismaCrawlStatus.NEW ||
    session.status === PrismaCrawlStatus.RUNNING ||
    session.status === PrismaCrawlStatus.PAUSED
  ) {
    await removeCrawlJob(sessionId);
  }

  return { message: CRAWL_SESSION_MESSAGES.ABORTED };
}

export async function pauseSession(projectId: string, appId: string, versionId: string, sessionId: string): Promise<MessageResponse> {
  await requireTargetApplication(projectId, appId);
  await requireApplicationVersion(appId, versionId);

  const session = await prisma.crawlSession.findFirst({
    where: { id: sessionId, appVersionId: versionId },
  });
  if (!session) throw new NotFoundError(CRAWL_SESSION_MESSAGES.NOT_FOUND);

  if (session.status !== PrismaCrawlStatus.RUNNING) {
    if (session.status === PrismaCrawlStatus.PAUSED) {
      return { message: CRAWL_SESSION_MESSAGES.ALREADY_PAUSED };
    }
    throw new ConflictError(CRAWL_SESSION_MESSAGES.INVALID_STATUS);
  }

  await prisma.crawlSession.update({
    where: { id: sessionId },
    data: { status: PrismaCrawlStatus.PAUSED },
  });

  return { message: CRAWL_SESSION_MESSAGES.PAUSED };
}
