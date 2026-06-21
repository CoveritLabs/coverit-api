// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { workerRedis } from "@lib/redis";
import { EMAIL_JOB_NAMES } from "@queues/email.queue";
import {
  sendFrameworkGeneratedEmail,
  sendFrameworkGenerationFailedEmail,
  sendIssueCreatedEmail,
  sendIssueFailedEmail,
  sendResetEmail,
} from "@services/email.service";
import { logger } from "@services/logger.service";
import { Worker } from "bullmq";

new Worker(
  "email",
  async (job) => {
    if (job.name === EMAIL_JOB_NAMES.SEND_RESET_EMAIL) {
      const { email, resetUrl, name } = job.data;
      await sendResetEmail(email, resetUrl, name);
    } else if (job.name === EMAIL_JOB_NAMES.ISSUE_CREATED) {
      const { email, provider, key, title, url, status, reportId } = job.data;
      await sendIssueCreatedEmail(email, { provider, key, title, url, status, reportId });
    } else if (job.name === EMAIL_JOB_NAMES.ISSUE_FAILED) {
      const { email, provider, title, errorMessage, reportId } = job.data;
      await sendIssueFailedEmail(email, { provider, title, errorMessage, reportId });
    } else if (job.name === EMAIL_JOB_NAMES.FRAMEWORK_GENERATED) {
      const { email, ...data } = job.data;
      await sendFrameworkGeneratedEmail(email, data);
    } else if (job.name === EMAIL_JOB_NAMES.FRAMEWORK_GENERATION_FAILED) {
      const { email, ...data } = job.data;
      await sendFrameworkGenerationFailedEmail(email, data);
    }
  },
  { connection: workerRedis },
);

logger.info("[Worker] Email worker started and listening for jobs...");
