// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Queue } from "bullmq";
import redis from "@lib/redis";

export const EMAIL_JOB_NAMES = {
  SEND_RESET_EMAIL: "send-reset-email",
  ISSUE_CREATED: "issue-created",
  ISSUE_FAILED: "issue-failed",
  FRAMEWORK_GENERATED: "framework-generated",
  FRAMEWORK_GENERATION_FAILED: "framework-generation-failed",
} as const;

export const emailQueue = new Queue("email", {
  connection: redis,
});

function notificationJobId(prefix: string, id: string): string {
  return `${prefix}--${id.replace(/:/g, "-")}`;
}

export interface IssueCreatedEmailJob {
  email: string;
  provider: string;
  key: string;
  title: string;
  url?: string | null;
  status: string;
  reportId: string;
}

export interface IssueFailedEmailJob {
  email: string;
  provider: string;
  title: string;
  errorMessage: string;
  reportId: string;
}

export interface FrameworkGeneratedEmailJob {
  email: string;
  name: string;
  sessionId: string;
  applicationName: string;
  frameworkName?: string;
  repositoryUrl?: string;
  branchName: string;
  changedFiles: string[];
  noChanges: boolean;
  pushed: boolean;
  pullRequestUrl?: string | null;
}

export interface FrameworkGenerationFailedEmailJob {
  email: string;
  name: string;
  sessionId: string;
  applicationName: string;
  frameworkName?: string;
  repositoryUrl?: string;
  errorMessage: string;
}

export async function enqueueIssueCreatedEmail(data: IssueCreatedEmailJob): Promise<void> {
  await emailQueue.add(EMAIL_JOB_NAMES.ISSUE_CREATED, data, {
    jobId: notificationJobId("issue-created", data.reportId),
  });
}

export async function enqueueIssueFailedEmail(data: IssueFailedEmailJob): Promise<void> {
  await emailQueue.add(EMAIL_JOB_NAMES.ISSUE_FAILED, data, {
    jobId: notificationJobId("issue-failed", data.reportId),
  });
}

export async function enqueueFrameworkGeneratedEmail(data: FrameworkGeneratedEmailJob): Promise<void> {
  await emailQueue.add(EMAIL_JOB_NAMES.FRAMEWORK_GENERATED, data, {
    jobId: notificationJobId("framework-generated", data.sessionId),
  });
}

export async function enqueueFrameworkGenerationFailedEmail(data: FrameworkGenerationFailedEmailJob): Promise<void> {
  await emailQueue.add(EMAIL_JOB_NAMES.FRAMEWORK_GENERATION_FAILED, data, {
    jobId: notificationJobId("framework-generation-failed", data.sessionId),
  });
}
