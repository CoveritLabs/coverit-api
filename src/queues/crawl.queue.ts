// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { enqueueCrawlSession, markCrawlSessionCancelled } from "@queues/stream/crawlStream";

export async function addCrawlJob(sessionId: string): Promise<void> {
    await enqueueCrawlSession(sessionId);
}

export async function removeCrawlJob(sessionId: string): Promise<boolean> {
    await markCrawlSessionCancelled(sessionId);
    return true;
}