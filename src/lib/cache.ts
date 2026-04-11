// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { env } from "@config/env";
import { CACHE_LOG_CONTEXTS, LOG_EVENTS } from "@constants/logEvents";
import redis from "@lib/redis";
import { logger } from "@services/logger.service";

type CacheMiss = null;

type CacheWarnMeta = {
  key?: string;
  keyPattern?: string;
  keyCount?: number;
  context?: string;
};

function warn(event: string, err: unknown, meta?: CacheWarnMeta): void {
  const message = err instanceof Error ? err.message : String(err);

  logger.warn(
    {
      event,
      module: "cache",
      error: message,
      ...meta,
    },
    meta?.context ?? CACHE_LOG_CONTEXTS.OPERATION_FAILED,
  );
}

async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";

  do {
    const [nextCursor, batch] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== "0");

  return keys;
}

export const cacheKeys = {
  auth: {
    refresh: (userId: string, tokenHash: string): string => `refresh:${userId}:${tokenHash}`,
    refreshPattern: (userId: string): string => `refresh:${userId}:*`,
    refreshByHashPattern: (tokenHash: string): string => `refresh:*:${tokenHash}`,
    reset: (hashedToken: string): string => `reset:${hashedToken}`,
  },
  user: {
    byId: (userId: string): string => `user:id:${userId}`,
    byEmail: (email: string): string => `user:email:${email.toLowerCase()}`,
    projects: (userId: string): string => `user:projects:${userId}`,
    projectsPattern: (): string => "user:projects:*",
  },
  project: {
    byId: (projectId: string): string => `project:${projectId}`,
    byIdPattern: (projectId: string): string => `project:${projectId}*`,
  },
  regressionCodebase: {
    byId: (codebaseId: string): string => `regression_codebase:${codebaseId}`,
    byApp: (appId: string): string => `app:regression_codebases:${appId}`,
  },
  crawlSession: {
    pid: (sessionId: string): string => `session:${sessionId}:pid`,
  },
} as const;

export async function cacheGetJSON<T>(key: string, context?: string): Promise<T | CacheMiss> {
  try {
    const payload = await redis.get(key);
    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as T;
  } catch (err) {
    warn(LOG_EVENTS.CACHE_GET_FAILED, err, { key, context });
    return null;
  }
}

export async function cacheGetString(key: string, context?: string): Promise<string | CacheMiss> {
  try {
    return await redis.get(key);
  } catch (err) {
    warn(LOG_EVENTS.CACHE_GET_FAILED, err, { key, context });
    return null;
  }
}

export async function cacheSetJSON(key: string, value: unknown, ttlSeconds = env.CACHE_TTL_SECONDS, context?: string): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    warn(LOG_EVENTS.CACHE_SET_FAILED, err, { key, context });
  }
}

export async function cacheSetString(key: string, value: string, ttlSeconds = env.CACHE_TTL_SECONDS, context?: string): Promise<void> {
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch (err) {
    warn(LOG_EVENTS.CACHE_SET_FAILED, err, { key, context });
  }
}

export async function cacheDel(keys: string[], context?: string): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  try {
    await redis.del(...keys);
  } catch (err) {
    warn(LOG_EVENTS.CACHE_DELETE_FAILED, err, { keyCount: keys.length, context });
  }
}

export async function cacheDelByPattern(pattern: string, context?: string): Promise<void> {
  try {
    const keys = await scanKeys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    warn(LOG_EVENTS.CACHE_INVALIDATION_FAILED, err, { keyPattern: pattern, context });
  }
}

export async function cacheScan(pattern: string, context?: string): Promise<string[]> {
  try {
    return await scanKeys(pattern);
  } catch (err) {
    warn(LOG_EVENTS.CACHE_SCAN_FAILED, err, { keyPattern: pattern, context });
    return [];
  }
}
