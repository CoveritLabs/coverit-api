// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Queue } from 'bullmq';
import redis from '@lib/redis';

export const crawlQueue = new Queue('crawler', {
    connection: redis
});

export async function addCrawlJob(sessionId: string) {
    await crawlQueue.add('crawl', { sessionId });
}

export async function removeCrawlJob(sessionId: string) {
    const jobs = await crawlQueue.getJobs(['waiting', 'delayed']);
    const job = jobs.find((j) => j.data.sessionId === sessionId);
    if (job) {
        await job.remove();
        return true;
    }
    return false;
}