// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import redis from "@lib/redis";

export const crawlStreamConfig = {
  streamKey: "crawl:jobs",
  cancelPrefix: "crawl:cancelled:",
  maxLen: Number(process.env.CRAWL_STREAM_MAXLEN ?? "10000"),
  cancelTtlSeconds: Number(process.env.CRAWL_CANCEL_TTL_SECONDS ?? "86400"),
} as const;

export async function enqueueCrawlSession(sessionId: string): Promise<void> {
  const maxLen = Number.isFinite(crawlStreamConfig.maxLen) ? crawlStreamConfig.maxLen : 10000;
  await redis.xadd(
    crawlStreamConfig.streamKey,
    "MAXLEN",
    "~",
    String(maxLen),
    "*",
    "sessionId",
    sessionId,
    "name",
    "crawl",
  );
}

export async function markCrawlSessionCancelled(sessionId: string): Promise<void> {
  const ttl = Number.isFinite(crawlStreamConfig.cancelTtlSeconds) ? crawlStreamConfig.cancelTtlSeconds : 86400;
  await redis.set(`${crawlStreamConfig.cancelPrefix}${sessionId}`, "1", "EX", ttl);
}
