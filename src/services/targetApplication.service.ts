// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { TARGET_APPLICATION_MESSAGES } from "@constants/messages";
import { ConflictError, NotFoundError } from "@utils/errors";
import type {
  CreateTargetApplicationRequest,
  UpdateTargetApplicationRequest,
  CreateTargetApplicationVersionRequest,
  TargetApplicationResponse,
  CreateTargetApplicationResponse,
} from "@models/targetApplication";
import type { MessageResponse } from "@models/common";

export async function createTargetApplication(projectId: string, input: CreateTargetApplicationRequest): Promise<CreateTargetApplicationResponse> {
  const existing = await prisma.targetApplication.findFirst({ where: { projectId, name: input.name } });
  if (existing) throw new ConflictError(TARGET_APPLICATION_MESSAGES.EXISTING_APPLICATION);

  const app = await prisma.targetApplication.create({ data: { projectId, name: input.name, baseUrl: input.baseUrl } });
  return { id: app.id };
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

  await prisma.targetApplication.delete({ where: { id: appId } });
  return { message: TARGET_APPLICATION_MESSAGES.DELETE_SUCCESS };
}

export async function getTargetApplications(projectId: string): Promise<TargetApplicationResponse[]> {
  const apps = await prisma.targetApplication.findMany({ where: { projectId }, include: { versions: true } });

  return apps.map((a) => ({ id: a.id, name: a.name, baseUrl: a.baseUrl, versions: a.versions.map((v) => ({ id: v.id, version: v.version })) }));
}

export async function getTargetApplication(projectId: string, appId: string): Promise<TargetApplicationResponse> {
  const app = await prisma.targetApplication.findUnique({ where: { id: appId }, include: { versions: true } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);

  return { id: app.id, name: app.name, baseUrl: app.baseUrl, versions: app.versions.map((v) => ({ id: v.id, version: v.version })) };
}

export async function createTargetApplicationVersion(projectId: string, appId: string, input: CreateTargetApplicationVersionRequest) {
  const app = await prisma.targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);

  const existing = await prisma.targetApplicationVersion.findFirst({ where: { targetApplicationId: appId, version: input.version } });
  if (existing) throw new ConflictError(TARGET_APPLICATION_MESSAGES.VERSION_EXISTS);

  const ver = await prisma.targetApplicationVersion.create({ data: { targetApplicationId: appId, version: input.version } });
  return { id: ver.id };
}

export async function deleteTargetApplicationVersion(projectId: string, appId: string, versionId: string) {
  const ver = await prisma.targetApplicationVersion.findUnique({ where: { id: versionId } });
  if (!ver) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.VERSION_NOT_FOUND);

  const app = await prisma.targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId || ver.targetApplicationId !== appId) throw new NotFoundError(TARGET_APPLICATION_MESSAGES.NOT_FOUND);

  await prisma.targetApplicationVersion.delete({ where: { id: versionId } });
  return { message: TARGET_APPLICATION_MESSAGES.VERSION_DELETE_SUCCESS };
}
