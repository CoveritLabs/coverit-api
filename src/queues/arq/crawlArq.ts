// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { env } from "@config/env";
import redis from "@lib/redis";
import { enqueueArqJob } from "@queues/arq";
import type { jobConfig } from "@queues/arq";
import { nowMs } from "@utils/date";

export const crawlArqConfig: jobConfig = {
  queueName: env.CRAWL_ARQ_QUEUE_NAME ?? "arq:queue",
  jobKeyPrefix: "arq:job:",
  resultKeyPrefix: "arq:result:",
  abortSetName: "arq:abort",
  expiresMs: Number("86400000"),
} as const;

export const manualArqConfig: jobConfig = {
  ...crawlArqConfig,
  queueName: env.MANUAL_ARQ_QUEUE_NAME,
} as const;

export async function enqueueCrawlSession(sessionId: string): Promise<string> {
  return enqueueArqJob(sessionId, "crawl_session", [sessionId], crawlArqConfig);
}

export async function enqueueManualRecordSession(sessionId: string): Promise<string> {
  return enqueueArqJob(sessionId, "manual_record_session", [sessionId], manualArqConfig);
}

export async function enqueueFlowEditorSession(editorSessionId: string, flowId: string): Promise<string> {
  return enqueueArqJob(editorSessionId, "flow_editor_session", [editorSessionId, flowId], manualArqConfig);
}

export async function abortCrawlSession(sessionId: string): Promise<void> {
  await redis
    .multi()
    .zrem(crawlArqConfig.queueName, sessionId)
    .del(`${crawlArqConfig.jobKeyPrefix}${sessionId}`)
    .zadd(crawlArqConfig.abortSetName!, nowMs(), sessionId)
    .exec();
}
