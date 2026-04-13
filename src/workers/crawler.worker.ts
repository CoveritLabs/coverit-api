// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Worker } from 'bullmq';
import { spawn } from 'child_process';
import redis from '@lib/redis';
import prisma from '@lib/prisma';
import { CrawlStatus } from '@models/crawlSession';

export const crawlWorker = new Worker('crawl-tasks', async (job) => {
    const { sessionId } = job.data;
    // only do it if its status is QUEUED, otherwise it means that the session was aborted while it was in the queue, and we should not start it.
    const session = await prisma.crawlSession.findFirstOrThrow({
        where: { id: sessionId }
    });
    if (session.status !== CrawlStatus[CrawlStatus.QUEUED]) {
        throw new Error(`Cannot start session with status ${session.status}`);
    }

    await prisma.crawlSession.update({
        where: { id: sessionId },
        data: {
            status: CrawlStatus[CrawlStatus.RUNNING],
            startedAt: new Date(),
        },
    });

    const pythonBinary = process.env.CRAWLER_PYTHON_BIN ?? 'python3';

    const pythonProcess = spawn(pythonBinary, ['main.py', '--session', sessionId], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: 'src/workers',
        detached: false,
    });

    const pid = pythonProcess.pid;
    if (pid === undefined) {
        throw new Error(`Failed to start crawler process for session ${sessionId}`);
    }
    await redis.set(`session:${sessionId}:pid`, String(pid), 'EX', 86400);

    const cleanup = async () => {
        await redis.del(`session:${sessionId}:pid`);
    };

    pythonProcess.once('close', () => {
        void cleanup();
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Session ${sessionId}] Python: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Session ${sessionId}] Error: ${data}`);
    });

    let deleted = false;

    const exitCode = await new Promise<number | null>((resolve) => {
        let lastStatus = CrawlStatus[CrawlStatus.RUNNING];
        let checking = false;

        const checkInterval = setInterval(async () => {
            if (checking) {
                return;
            }

            checking = true;
            let current;
            try {
                current = await prisma.crawlSession.findFirstOrThrow({
                    where: { id: sessionId },
                    select: { status: true }
                });
            } catch (e) {
                // this means that the session was deleted while the crawl was running. In this case, we should stop the crawl immediately.
                pythonProcess.stdin.write('ABORT\n');
                clearInterval(checkInterval);
                setTimeout(() => pythonProcess.kill('SIGKILL'), 2000);
                deleted = true;
                return;
            }

            checking = false;

            if (!current) return;
            if (current.status === CrawlStatus[CrawlStatus.ABORTED]) {
                pythonProcess.stdin.write('ABORT\n');
                clearInterval(checkInterval);
                setTimeout(() => pythonProcess.kill('SIGKILL'), 2000);
                return;
            }

            if (current.status !== lastStatus) {
                if (current.status === CrawlStatus[CrawlStatus.PAUSED]) {
                    pythonProcess.stdin.write('PAUSE\n');
                } else if (current.status === CrawlStatus[CrawlStatus.RUNNING]) {
                    pythonProcess.stdin.write('RESUME\n');
                }
                lastStatus = current.status;
            }
        }, 3000);

        pythonProcess.on('close', (code) => {
            clearInterval(checkInterval);
            resolve(code);
        });

        pythonProcess.on('error', (err) => {
            console.error("Failed to start child process:", err);
            clearInterval(checkInterval);
            resolve(1);
        });
    });

    if (!deleted) {
        const finalSession = await prisma.crawlSession.findUnique({ where: { id: sessionId } });
        const isAborted = finalSession?.status === CrawlStatus[CrawlStatus.ABORTED];
        const isStopped = finalSession?.status === CrawlStatus[CrawlStatus.PAUSED];

        if (exitCode === 0) {
            if (!isAborted && !isStopped) {
                await prisma.crawlSession.update({
                    where: { id: sessionId },
                    data: { status: CrawlStatus[CrawlStatus.COMPLETED], finishedAt: new Date() }
                });
            }
        } else {
            if (!isAborted) {
                await prisma.crawlSession.update({
                    where: { id: sessionId },
                    data: { status: CrawlStatus[CrawlStatus.FAILED], finishedAt: new Date() }
                });
            }
        }
    }
}, { connection: redis });