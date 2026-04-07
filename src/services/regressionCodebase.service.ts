// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { REGRESSION_CODEBASE_MESSAGES } from "@constants/messages";
import { ConflictError, NotFoundError } from "@utils/errors";
import type { CreateRegressionCodebaseRequest, UpdateRegressionCodebaseRequest, RegressionCodebaseResponse } from "@models/regressionCodebase";

export async function createRegressionCodebase(appId: string, input: CreateRegressionCodebaseRequest) {
  const existingRepo = await prisma.regressionCodebase.findFirst({ where: { targetApplicationId: appId, repositoryUrl: input.repositoryUrl } });
  if (existingRepo) throw new ConflictError(REGRESSION_CODEBASE_MESSAGES.EXISTING_REPOSITORY);

  const cb = await prisma.regressionCodebase.create({
    data: { targetApplicationId: appId, frameworkName: input.frameworkName, repositoryUrl: input.repositoryUrl, apiKey: input.apiKey },
  });
  return { id: cb.id };
}

export async function updateRegressionCodebase(appId: string, codebaseId: string, input: UpdateRegressionCodebaseRequest) {
  const cb = await prisma.regressionCodebase.findUnique({ where: { id: codebaseId } });
  if (!cb || cb.targetApplicationId !== appId) throw new NotFoundError(REGRESSION_CODEBASE_MESSAGES.NOT_FOUND);

  await prisma.regressionCodebase.update({
    where: { id: codebaseId },
    data: {
      frameworkName: input.frameworkName ?? cb.frameworkName,
      repositoryUrl: input.repositoryUrl ?? cb.repositoryUrl,
      apiKey: input.apiKey ?? cb.apiKey,
    },
  });
  return { message: REGRESSION_CODEBASE_MESSAGES.UPDATE_SUCCESS };
}

export async function deleteRegressionCodebase(appId: string, codebaseId: string) {
  const cb = await prisma.regressionCodebase.findUnique({ where: { id: codebaseId } });
  if (!cb || cb.targetApplicationId !== appId) throw new NotFoundError(REGRESSION_CODEBASE_MESSAGES.NOT_FOUND);

  await prisma.regressionCodebase.delete({ where: { id: codebaseId } });
  return { message: REGRESSION_CODEBASE_MESSAGES.DELETE_SUCCESS };
}

export async function getRegressionCodebasesByApp(appId: string): Promise<RegressionCodebaseResponse[]> {
  const items = await prisma.regressionCodebase.findMany({ where: { targetApplicationId: appId } });
  return items.map((i) => ({ id: i.id, frameworkName: i.frameworkName, repositoryUrl: i.repositoryUrl }));
}

export async function getRegressionCodebase(appId: string, codebaseId: string): Promise<RegressionCodebaseResponse> {
  const cb = await prisma.regressionCodebase.findUnique({ where: { id: codebaseId } });
  if (!cb || cb.targetApplicationId !== appId) throw new NotFoundError(REGRESSION_CODEBASE_MESSAGES.NOT_FOUND);
  return { id: cb.id, frameworkName: cb.frameworkName, repositoryUrl: cb.repositoryUrl };
}
