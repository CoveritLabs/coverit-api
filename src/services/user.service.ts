// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { cacheDel, cacheGetJSON, cacheKeys, cacheSetJSON } from "@lib/cache";
import { CACHE_LOG_CONTEXTS } from "@constants/logEvents";
import { BadRequestError, NotFoundError } from "@utils/errors";
import { USER_MESSAGES } from "@constants/messages";
import type { UserInfo } from "@models/user";
import type { MessageResponse } from "@models/common";

export async function getUser(userId: string): Promise<UserInfo> {
  const cacheKey = cacheKeys.user.byId(userId);
  const cached = await cacheGetJSON<UserInfo>(cacheKey, CACHE_LOG_CONTEXTS.USER_READ);
  if (cached !== null) {
    return cached;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError(USER_MESSAGES.NOT_FOUND);
  }

  const result: UserInfo = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  await cacheSetJSON(cacheKeys.user.byId(result.id), result, undefined, CACHE_LOG_CONTEXTS.USER_WRITE_BY_ID);
  await cacheSetJSON(cacheKeys.user.byEmail(result.email), result, undefined, CACHE_LOG_CONTEXTS.USER_WRITE_BY_EMAIL);

  return result;
}

export async function updateUser(userId: string, input: { name?: string; email?: string }): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError(USER_MESSAGES.NOT_FOUND);
  }

  const data: { name?: string; email?: string } = {};
  if (input.name) {
    data.name = input.name;
  }
  if (input.email) {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestError(USER_MESSAGES.EMAIL_IN_USE);
    }
    data.email = input.email;
  }

  await prisma.user.update({ where: { id: userId }, data });

  await cacheDel(
    [cacheKeys.user.byId(userId), cacheKeys.user.byEmail(user.email), ...(input.email ? [cacheKeys.user.byEmail(input.email)] : [])],
    CACHE_LOG_CONTEXTS.USER_INVALIDATE,
  );

  return { message: USER_MESSAGES.UPDATE_SUCCESS };
}

export async function deleteUser(userId: string): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError(USER_MESSAGES.NOT_FOUND);
  }

  await prisma.user.delete({ where: { id: userId } });

  await cacheDel([cacheKeys.user.byId(userId), cacheKeys.user.byEmail(user.email)], CACHE_LOG_CONTEXTS.USER_INVALIDATE);

  return { message: USER_MESSAGES.DELETE_SUCCESS };
}

export async function getUsersByEmails(emails: string[]): Promise<UserInfo[]> {
  const normalized = emails.map((e) => e.toLowerCase());
  const results: UserInfo[] = [];
  const missing: string[] = [];

  for (const email of normalized) {
    const cached = await cacheGetJSON<UserInfo>(cacheKeys.user.byEmail(email), CACHE_LOG_CONTEXTS.USER_READ_BY_EMAIL);
    if (cached !== null) {
      results.push(cached);
      continue;
    }

    missing.push(email);
  }

  if (missing.length > 0) {
    const users = await prisma.user.findMany({ where: { email: { in: missing } } });
    for (const user of users) {
      const info: UserInfo = { id: user.id, email: user.email, name: user.name };
      results.push(info);
      await Promise.all([
        cacheSetJSON(cacheKeys.user.byEmail(user.email), info, undefined, CACHE_LOG_CONTEXTS.USER_WRITE_BY_EMAIL_BATCH),
        cacheSetJSON(cacheKeys.user.byId(user.id), info, undefined, CACHE_LOG_CONTEXTS.USER_WRITE_BY_ID_BATCH),
      ]);
    }
  }

  return results;
}
