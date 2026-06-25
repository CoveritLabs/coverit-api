// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { CRAWL_SCHEDULE_MESSAGES, REGRESSION_CODEBASE_MESSAGES, TARGET_APPLICATION_MESSAGES } from "@constants/messages";
import { BadRequestError, NotFoundError } from "@utils/errors";
import { fromPersistedCrawlConfig, toPersistedCrawlConfig, toPersistedCodegenConfig } from "@mappers/crawlSession.mapper";
import { DEFAULT_CRAWL_CONFIG } from "@constants/crawlConfig";
import { toIso } from "@utils/date";
import type { MessageResponse } from "@models/common";
import {
  CrawlScheduleMode,
  CrawlScheduleType,
  type CrawlScheduleData,
  type CreateCrawlScheduleRequest,
  type UpdateCrawlScheduleRequest,
  CrawlConfigSchema,
  CodegenConfigSchema,
} from "@models/crawlSchedule";
import { fromDbCrawlScheduleMode, fromDbCrawlScheduleType, toDbCrawlScheduleMode, toDbCrawlScheduleType } from "@mappers/crawlSchedule.mapper";

const mapSchedule = (schedule: Awaited<ReturnType<typeof prisma.crawlSchedule.findFirstOrThrow>>): CrawlScheduleData => ({
  id: schedule.id,
  targetApplicationId: schedule.targetApplicationId,
  scheduleType: fromDbCrawlScheduleType(schedule.scheduleType),
  mode: fromDbCrawlScheduleMode(schedule.scheduleMode),
  versionId: schedule.versionId ?? undefined,
  cron: schedule.cronExpression ?? undefined,
  timezone: schedule.timezone ?? undefined,
  runAt: toIso(schedule.runAt),
  isActive: schedule.isActive,
  catchUp: schedule.catchUp,

  crawlConfig: (() => {
    const parsed = CrawlConfigSchema.safeParse(fromPersistedCrawlConfig(schedule.crawlConfig, { ...DEFAULT_CRAWL_CONFIG }));
    return parsed.success ? parsed.data : { ...DEFAULT_CRAWL_CONFIG };
  })(),

  codegenConfig: (() => {
    const parsed = CodegenConfigSchema.safeParse(schedule.codegenConfig);
    return parsed.success ? parsed.data : undefined;
  })(),

  regressionCodebaseId: schedule.regressionCodebaseId ?? undefined,
  nextRunAt: toIso(schedule.nextRunAt),
  lastRunAt: toIso(schedule.lastRunAt),
  createdAt: schedule.createdAt.toISOString(),
  updatedAt: schedule.updatedAt.toISOString(),
});

async function requireTargetApplication(projectId: string, appId: string) {
  const app = await prisma.targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) {
    throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);
  }
  return app;
}

async function requireApplicationVersion(appId: string, versionId: string) {
  const version = await prisma.targetApplicationVersion.findFirst({
    where: { id: versionId, targetApplicationId: appId },
  });
  if (!version) {
    throw new NotFoundError(TARGET_APPLICATION_MESSAGES.VERSION_NOT_FOUND);
  }
  return version;
}

async function requireRegressionCodebase(appId: string, regressionCodebaseId: string) {
  const codebase = await prisma.regressionCodebase.findUnique({ where: { id: regressionCodebaseId } });
  if (!codebase || codebase.targetApplicationId !== appId) {
    throw new NotFoundError(REGRESSION_CODEBASE_MESSAGES.NOT_FOUND);
  }
  return codebase;
}

function parseRunAt(runAt?: string | null): Date | null {
  if (!runAt) return null;
  const parsed = new Date(runAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestError(CRAWL_SCHEDULE_MESSAGES.INVALID_SCHEDULE);
  }
  return parsed;
}

function validateScheduleInput(
  input: CreateCrawlScheduleRequest | UpdateCrawlScheduleRequest,
  existing?: { runAt?: Date | null; cron?: string | null },
) {
  const scheduleType = input.scheduleType;
  if (scheduleType === CrawlScheduleType.ONCE && !(input.runAt ?? existing?.runAt)) {
    throw new BadRequestError(CRAWL_SCHEDULE_MESSAGES.RUN_AT_REQUIRED);
  }

  if (scheduleType === CrawlScheduleType.CRON && !(input.cron ?? existing?.cron)) {
    throw new BadRequestError(CRAWL_SCHEDULE_MESSAGES.CRON_REQUIRED);
  }

  if (input.mode === CrawlScheduleMode.FIXED_VERSION && !input.versionId) {
    throw new BadRequestError(CRAWL_SCHEDULE_MESSAGES.VERSION_REQUIRED);
  }
}

export async function createSchedule(
  projectId: string,
  appId: string,
  creatorUserId: string,
  input: CreateCrawlScheduleRequest,
): Promise<CrawlScheduleData> {
  await requireTargetApplication(projectId, appId);
  validateScheduleInput(input);

  if (input.mode === CrawlScheduleMode.FIXED_VERSION) {
    if (!input.versionId) {
      throw new BadRequestError(CRAWL_SCHEDULE_MESSAGES.VERSION_REQUIRED);
    }
    await requireApplicationVersion(appId, input.versionId);
  }

  if (input.regressionCodebaseId) {
    await requireRegressionCodebase(appId, input.regressionCodebaseId);
  }

  const runAt = parseRunAt(input.runAt ?? null);
  const crawlConfig = CrawlConfigSchema.parse(input.crawlConfig ?? { ...DEFAULT_CRAWL_CONFIG });
  const persistedConfig = toPersistedCrawlConfig(crawlConfig);
  const persistedCodegenConfig = toPersistedCodegenConfig(input.codegenConfig);

  const schedule = await prisma.crawlSchedule.create({
    data: {
      targetApplicationId: appId,
      creatorUserId,
      versionId: input.mode === CrawlScheduleMode.FIXED_VERSION ? input.versionId : null,
      regressionCodebaseId: input.regressionCodebaseId ?? null,
      scheduleType: toDbCrawlScheduleType(input.scheduleType),
      scheduleMode: toDbCrawlScheduleMode(input.mode),
      cronExpression: input.cron ?? null,
      timezone: input.timezone ?? null,
      runAt,
      isActive: input.isActive ?? true,
      catchUp: input.catchUp ?? false,
      crawlConfig: persistedConfig,
      codegenConfig: persistedCodegenConfig,
      nextRunAt: input.scheduleType === CrawlScheduleType.ONCE ? runAt : null,
    },
  });

  return mapSchedule(schedule);
}

export async function getSchedules(projectId: string, appId: string): Promise<CrawlScheduleData[]> {
  await requireTargetApplication(projectId, appId);
  const schedules = await prisma.crawlSchedule.findMany({
    where: { targetApplicationId: appId },
    orderBy: { createdAt: "desc" },
  });
  return schedules.map(mapSchedule);
}

export async function getSchedule(projectId: string, appId: string, scheduleId: string): Promise<CrawlScheduleData> {
  await requireTargetApplication(projectId, appId);
  const schedule = await prisma.crawlSchedule.findFirst({
    where: { id: scheduleId, targetApplicationId: appId },
  });
  if (!schedule) throw new NotFoundError(CRAWL_SCHEDULE_MESSAGES.NOT_FOUND);
  return mapSchedule(schedule);
}

export async function updateSchedule(
  projectId: string,
  appId: string,
  scheduleId: string,
  input: UpdateCrawlScheduleRequest,
): Promise<CrawlScheduleData> {
  await requireTargetApplication(projectId, appId);
  const schedule = await prisma.crawlSchedule.findFirst({
    where: { id: scheduleId, targetApplicationId: appId },
  });
  if (!schedule) throw new NotFoundError(CRAWL_SCHEDULE_MESSAGES.NOT_FOUND);

  validateScheduleInput(input, { runAt: schedule.runAt, cron: schedule.cronExpression });

  if (input.mode === CrawlScheduleMode.FIXED_VERSION && input.versionId) {
    await requireApplicationVersion(appId, input.versionId);
  }

  if (input.regressionCodebaseId) {
    await requireRegressionCodebase(appId, input.regressionCodebaseId);
  }

  const runAt = input.runAt ? parseRunAt(input.runAt) : schedule.runAt;
  const crawlConfig = (() => {
    if (input.crawlConfig) {
      return CrawlConfigSchema.parse(input.crawlConfig);
    }
    const parsed = CrawlConfigSchema.safeParse(fromPersistedCrawlConfig(schedule.crawlConfig, { ...DEFAULT_CRAWL_CONFIG }));
    return parsed.success ? parsed.data : { ...DEFAULT_CRAWL_CONFIG };
  })();
  const persistedConfig = toPersistedCrawlConfig(crawlConfig);
  const persistedCodegenConfig = input.codegenConfig
    ? toPersistedCodegenConfig(input.codegenConfig)
    : toPersistedCodegenConfig(schedule.codegenConfig ? CodegenConfigSchema.parse(schedule.codegenConfig) : undefined);

  const scheduleType = input.scheduleType ?? fromDbCrawlScheduleType(schedule.scheduleType);
  const mode = input.mode ?? fromDbCrawlScheduleMode(schedule.scheduleMode);

  const updated = await prisma.crawlSchedule.update({
    where: { id: scheduleId },
    data: {
      versionId: mode === CrawlScheduleMode.FIXED_VERSION ? (input.versionId ?? schedule.versionId) : null,
      regressionCodebaseId: input.regressionCodebaseId ?? schedule.regressionCodebaseId,
      scheduleType: toDbCrawlScheduleType(scheduleType),
      scheduleMode: toDbCrawlScheduleMode(mode),
      cronExpression: input.cron ?? schedule.cronExpression,
      timezone: input.timezone ?? schedule.timezone,
      runAt,
      isActive: input.isActive ?? schedule.isActive,
      catchUp: input.catchUp ?? schedule.catchUp,
      crawlConfig: persistedConfig,
      codegenConfig: persistedCodegenConfig,
      nextRunAt: scheduleType === CrawlScheduleType.ONCE ? runAt : null,
      lastRunAt: input.scheduleType || input.cron || input.runAt ? null : schedule.lastRunAt,
    },
  });

  return mapSchedule(updated);
}

export async function deleteSchedule(projectId: string, appId: string, scheduleId: string): Promise<MessageResponse> {
  await requireTargetApplication(projectId, appId);
  const schedule = await prisma.crawlSchedule.findFirst({
    where: { id: scheduleId, targetApplicationId: appId },
  });
  if (!schedule) throw new NotFoundError(CRAWL_SCHEDULE_MESSAGES.NOT_FOUND);
  await prisma.crawlSchedule.delete({ where: { id: scheduleId } });
  return { message: CRAWL_SCHEDULE_MESSAGES.DELETE_SUCCESS };
}
