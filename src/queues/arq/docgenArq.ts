// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { randomUUID } from "crypto";

import { enqueueArqJob } from "@queues/arq";
import type { jobConfig } from "@queues/arq";

export const docgenArqConfig: jobConfig = {
  queueName: "docgen:queue",
  jobKeyPrefix: "arq:job:",
  resultKeyPrefix: "arq:result:",
  expiresMs: Number("86400000"),
} as const;

export async function enqueueBddGeneration(payload: Record<string, unknown>): Promise<string> {
  const jobId = `docgen:bdd:${randomUUID()}`;
  return enqueueArqJob(jobId, "task_generate_bdd", [payload], docgenArqConfig);
}

export async function enqueueManualBugReport(payload: Record<string, unknown>): Promise<string> {
  const jobId = `docgen:manual-bug:${randomUUID()}`;
  return enqueueArqJob(jobId, "task_generate_manual_bug_report", [payload], docgenArqConfig);
}
