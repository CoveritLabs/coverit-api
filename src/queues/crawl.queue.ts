// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { abortCrawlSession, enqueueCrawlSession } from "@queues/arq/crawlArq";

export async function addCrawlJob(sessionId: string): Promise<string> {
  return enqueueCrawlSession(sessionId);
}

export async function removeCrawlJob(sessionId: string): Promise<boolean> {
  await abortCrawlSession(sessionId);
  return true;
}
