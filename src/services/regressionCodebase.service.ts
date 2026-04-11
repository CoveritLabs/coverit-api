// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { CACHE_LOG_CONTEXTS } from "@constants/logEvents";
import { REGRESSION_CODEBASE_MESSAGES } from "@constants/messages";
import { ConflictError, NotFoundError } from "@utils/errors";
import type { CreateRegressionCodebaseRequest, UpdateRegressionCodebaseRequest, RegressionCodebaseResponse } from "@models/regressionCodebase";
import { cacheDel, cacheGetJSON, cacheKeys, cacheSetJSON } from "@lib/cache";

export async function createRegressionCodebase(appId: string, input: CreateRegressionCodebaseRequest) {
  const existingRepo = await prisma.regressionCodebase.findFirst({ where: { targetApplicationId: appId, repositoryUrl: input.repositoryUrl } });
  if (existingRepo) throw new ConflictError(REGRESSION_CODEBASE_MESSAGES.EXISTING_REPOSITORY);

  const cb = await prisma.regressionCodebase.create({
    data: { targetApplicationId: appId, frameworkName: input.frameworkName, repositoryUrl: input.repositoryUrl, apiKey: input.apiKey },
  });

  await cacheDel([cacheKeys.regressionCodebase.byApp(appId)], CACHE_LOG_CONTEXTS.REGRESSION_INVALIDATE);

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

  await cacheDel(
    [cacheKeys.regressionCodebase.byId(codebaseId), cacheKeys.regressionCodebase.byApp(appId)],
    CACHE_LOG_CONTEXTS.REGRESSION_INVALIDATE,
  );

  return { message: REGRESSION_CODEBASE_MESSAGES.UPDATE_SUCCESS };
}

export async function deleteRegressionCodebase(appId: string, codebaseId: string) {
  const cb = await prisma.regressionCodebase.findUnique({ where: { id: codebaseId } });
  if (!cb || cb.targetApplicationId !== appId) throw new NotFoundError(REGRESSION_CODEBASE_MESSAGES.NOT_FOUND);

  await prisma.regressionCodebase.delete({ where: { id: codebaseId } });

  await cacheDel(
    [cacheKeys.regressionCodebase.byId(codebaseId), cacheKeys.regressionCodebase.byApp(appId)],
    CACHE_LOG_CONTEXTS.REGRESSION_INVALIDATE,
  );

  return { message: REGRESSION_CODEBASE_MESSAGES.DELETE_SUCCESS };
}

export async function getRegressionCodebasesByApp(appId: string): Promise<RegressionCodebaseResponse[]> {
  const cacheKey = cacheKeys.regressionCodebase.byApp(appId);
  const cached = await cacheGetJSON<RegressionCodebaseResponse[]>(cacheKey, CACHE_LOG_CONTEXTS.REGRESSION_READ_LIST);
  if (cached !== null) {
    return cached;
  }

  const items = await prisma.regressionCodebase.findMany({ where: { targetApplicationId: appId } });
  const result = items.map((i) => ({ id: i.id, frameworkName: i.frameworkName, repositoryUrl: i.repositoryUrl }));

  await cacheSetJSON(cacheKey, result, undefined, CACHE_LOG_CONTEXTS.REGRESSION_WRITE_LIST);

  return result;
}

export async function getRegressionCodebase(appId: string, codebaseId: string): Promise<RegressionCodebaseResponse> {
  const cacheKey = cacheKeys.regressionCodebase.byId(codebaseId);
  const cached = await cacheGetJSON<RegressionCodebaseResponse>(cacheKey, CACHE_LOG_CONTEXTS.REGRESSION_READ);
  if (cached !== null) {
    return cached;
  }

  const cb = await prisma.regressionCodebase.findUnique({ where: { id: codebaseId } });
  if (!cb || cb.targetApplicationId !== appId) throw new NotFoundError(REGRESSION_CODEBASE_MESSAGES.NOT_FOUND);

  const result: RegressionCodebaseResponse = { id: cb.id, frameworkName: cb.frameworkName, repositoryUrl: cb.repositoryUrl };
  await cacheSetJSON(cacheKey, result, undefined, CACHE_LOG_CONTEXTS.REGRESSION_WRITE);

  return result;
}
