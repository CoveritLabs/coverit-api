// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import redis from "@lib/redis";

export const crawlArqConfig = {
  queueName: "arq:queue",
  jobKeyPrefix: "arq:job:",
  resultKeyPrefix: "arq:result:",
  abortSetName: "arq:abort",
  expiresMs: Number("86400000"),
} as const;

function expiryMs(): number {
  return Number.isFinite(crawlArqConfig.expiresMs) ? crawlArqConfig.expiresMs : 86400000;
}

function nowMs(): number {
  return Date.now();
}

function jobPayload(functionName: string, args: unknown[]): string {
  return JSON.stringify({
    t: null,
    f: functionName,
    a: args,
    k: {},
    et: nowMs(),
  });
}

async function enqueueArqJob(jobId: string, functionName: string, args: unknown[]): Promise<string> {
  const script = `
if redis.call("exists", KEYS[1]) == 1 or redis.call("exists", KEYS[2]) == 1 then
  return nil
end
redis.call("psetex", KEYS[1], ARGV[1], ARGV[2])
redis.call("zadd", KEYS[3], ARGV[3], ARGV[4])
return ARGV[4]
`;
  const result = await redis.eval(
    script,
    3,
    `${crawlArqConfig.jobKeyPrefix}${jobId}`,
    `${crawlArqConfig.resultKeyPrefix}${jobId}`,
    crawlArqConfig.queueName,
    String(expiryMs()),
    jobPayload(functionName, args),
    String(nowMs()),
    jobId,
  );
  if (!result) {
    return jobId;
  }
  return String(result);
}

export async function enqueueCrawlSession(sessionId: string): Promise<string> {
  return enqueueArqJob(sessionId, "crawl_session", [sessionId]);
}

export async function enqueueManualRecordSession(sessionId: string): Promise<string> {
  return enqueueArqJob(sessionId, "manual_record_session", [sessionId]);
}

export async function abortCrawlSession(sessionId: string): Promise<void> {
  await redis
    .multi()
    .zrem(crawlArqConfig.queueName, sessionId)
    .del(`${crawlArqConfig.jobKeyPrefix}${sessionId}`)
    .zadd(crawlArqConfig.abortSetName, nowMs(), sessionId)
    .exec();
}
