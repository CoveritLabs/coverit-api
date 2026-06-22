// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { TARGET_APPLICATION_MESSAGES } from "@constants/messages";
import { ConflictError, NotFoundError } from "@utils/errors";
import { removeCrawlJob } from "@queues/crawl.queue";
import { CrawlStatus as PrismaCrawlStatus } from "@generated/prisma/client";
import { generateApplicationApiKey, hashToken, previewApplicationApiKey } from "@utils/token";
import { mapTargetApplication } from "@mappers/targetApplication.mapper";
import { deleteArtifactsForApplications } from "@services/artifactCleanup.service";
import type {
  CreateTargetApplicationRequest,
  UpdateTargetApplicationRequest,
  CreateTargetApplicationVersionRequest,
  TargetApplicationResponse,
  CreateTargetApplicationResponse,
  CreateTargetApplicationVersionResponse,
  RotateTargetApplicationApiKeyResponse,
} from "@models/targetApplication";
import type { MessageResponse } from "@models/common";

export async function createTargetApplication(projectId: string, input: CreateTargetApplicationRequest): Promise<CreateTargetApplicationResponse> {
  const existing = await prisma.targetApplication.findFirst({ where: { projectId, name: input.name } });
  if (existing) throw new ConflictError(TARGET_APPLICATION_MESSAGES.EXISTING_APPLICATION);

  const apiKey = generateApplicationApiKey();
  const apiKeyPreview = previewApplicationApiKey(apiKey);
  const app = await prisma.targetApplication.create({
    data: {
      projectId,
      name: input.name,
      baseUrl: input.baseUrl,
      apiKeyHash: hashToken(apiKey),
      apiKeyPreview,
      apiKeyCreatedAt: new Date(),
    },
  });
  return { id: app.id, apiKey, apiKeyPreview };
}

export async function updateTargetApplication(projectId: string, appId: string, input: UpdateTargetApplicationRequest): Promise<MessageResponse> {
  const app = await prisma.targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);

  if (input.name && input.name !== app.name) {
    const other = await prisma.targetApplication.findFirst({ where: { projectId, name: input.name } });
    if (other && other.id !== appId) throw new ConflictError(TARGET_APPLICATION_MESSAGES.EXISTING_APPLICATION);
  }

  await prisma.targetApplication.update({ where: { id: appId }, data: { name: input.name ?? app.name, baseUrl: input.baseUrl ?? app.baseUrl } });

  return { message: TARGET_APPLICATION_MESSAGES.UPDATE_SUCCESS };
}

export async function deleteTargetApplication(projectId: string, appId: string): Promise<MessageResponse> {
  const app = await prisma.targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);

  const sessions = await prisma.crawlSession.findMany({
    where: {
      appVersion: { targetApplicationId: appId },
      status: { in: [PrismaCrawlStatus.NEW, PrismaCrawlStatus.QUEUED, PrismaCrawlStatus.RUNNING, PrismaCrawlStatus.PAUSED] },
    },
    select: { id: true },
  });

  await Promise.all(
    sessions.map(async (session) => {
      await removeCrawlJob(session.id);
      await prisma.crawlSession.update({
        where: { id: session.id },
        data: { status: PrismaCrawlStatus.ABORTED, finishedAt: new Date() },
      });
    }),
  );

  await deleteArtifactsForApplications([appId]);
  await prisma.targetApplication.delete({ where: { id: appId } });
  return { message: TARGET_APPLICATION_MESSAGES.DELETE_SUCCESS };
}

export async function getTargetApplications(projectId: string): Promise<TargetApplicationResponse[]> {
  const apps = await prisma.targetApplication.findMany({ where: { projectId }, include: { versions: true } });

  return apps.map(mapTargetApplication);
}

export async function getTargetApplication(projectId: string, appId: string): Promise<TargetApplicationResponse> {
  const app = await prisma.targetApplication.findUnique({ where: { id: appId }, include: { versions: true } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);

  return mapTargetApplication(app);
}

export async function rotateTargetApplicationApiKey(projectId: string, appId: string): Promise<RotateTargetApplicationApiKeyResponse> {
  const app = await prisma.targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);

  const apiKey = generateApplicationApiKey();
  const apiKeyPreview = previewApplicationApiKey(apiKey);
  await prisma.targetApplication.update({
    where: { id: appId },
    data: {
      apiKeyHash: hashToken(apiKey),
      apiKeyPreview,
      apiKeyRotatedAt: new Date(),
      apiKeyCreatedAt: app.apiKeyCreatedAt ?? new Date(),
    },
  });

  return { apiKey, apiKeyPreview };
}

export async function createTargetApplicationVersion(
  projectId: string,
  appId: string,
  input: CreateTargetApplicationVersionRequest,
): Promise<CreateTargetApplicationVersionResponse> {
  const app = await prisma.targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);

  const existing = await prisma.targetApplicationVersion.findFirst({ where: { targetApplicationId: appId, version: input.version } });
  if (existing) throw new ConflictError(TARGET_APPLICATION_MESSAGES.VERSION_EXISTS);

  const ver = await prisma.targetApplicationVersion.create({ data: { targetApplicationId: appId, version: input.version } });
  return { id: ver.id };
}

export async function deleteTargetApplicationVersion(projectId: string, appId: string, versionId: string): Promise<MessageResponse> {
  const ver = await prisma.targetApplicationVersion.findUnique({ where: { id: versionId } });
  if (!ver) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.VERSION_NOT_FOUND);

  const app = await prisma.targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId || ver.targetApplicationId !== appId) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);

  const sessions = await prisma.crawlSession.findMany({
    where: {
      appVersionId: versionId,
      status: { in: [PrismaCrawlStatus.NEW, PrismaCrawlStatus.QUEUED, PrismaCrawlStatus.RUNNING, PrismaCrawlStatus.PAUSED] },
    },
    select: { id: true },
  });

  await Promise.all(
    sessions.map(async (session) => {
      await removeCrawlJob(session.id);
      await prisma.crawlSession.update({
        where: { id: session.id },
        data: { status: PrismaCrawlStatus.ABORTED, finishedAt: new Date() },
      });
    }),
  );

  await prisma.crawlSchedule.updateMany({
    where: { versionId },
    data: { isActive: false, nextRunAt: null },
  });

  await prisma.targetApplicationVersion.delete({ where: { id: versionId } });
  return { message: TARGET_APPLICATION_MESSAGES.VERSION_DELETE_SUCCESS };
}
