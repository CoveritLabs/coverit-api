// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import redis from "@lib/redis";
import { nowMs } from "@utils/date";

export interface jobConfig {
  queueName: string;
  jobKeyPrefix: string;
  resultKeyPrefix: string;
  abortSetName?: string;
  expiresMs: number;
}

function expiryMs(expiresMs: number): number {
  return Number.isFinite(expiresMs) ? expiresMs : 86400000;
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

export async function enqueueArqJob(jobId: string, functionName: string, args: unknown[], config: jobConfig): Promise<string> {
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
    `${config.jobKeyPrefix}${jobId}`,
    `${config.resultKeyPrefix}${jobId}`,
    config.queueName,
    String(expiryMs(config.expiresMs)),
    jobPayload(functionName, args),
    String(nowMs()),
    jobId,
  );
  if (!result) {
    return jobId;
  }
  return String(result);
}
