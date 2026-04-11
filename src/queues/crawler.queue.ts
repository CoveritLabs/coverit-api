// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import redis from "@lib/redis";
import { Queue } from "bullmq";
import type { CrawlJobPayload } from "types/crawler";

export const crawlerQueue = new Queue("crawler", {
  connection: redis,
});

export async function enqueueCrawlJob(payload: CrawlJobPayload): Promise<string> {
  const job = await crawlerQueue.add("crawl", payload);
  return String(job.id);
}
