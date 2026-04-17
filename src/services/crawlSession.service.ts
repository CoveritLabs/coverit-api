// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { CrawlStatus as PrismaCrawlStatus } from "@generated/prisma/client";
import {
    fromDbCrawlStatus,
    fromDbCrawlTriggerType,
    toDbCrawlStatusFilter,
    toDbCrawlTriggerType,
    toDbCrawlTriggerTypeFilter,
} from "@mappers/crawlSession.mapper";
import {
    type CrawlConfig,
    CrawlConfigSchema,
    CrawlTriggerType,
    type ApplicationVersionCrawlSessionsResponse,
    type CrawlSessionData,
    type GetSessionsQuery,
} from "@models/crawlSession";
import { removeCrawlJob, addCrawlJob } from "@queues/crawl.queue";
import { toIso } from "@utils/date";


type DbCrawlSession = Awaited<ReturnType<typeof prisma.crawlSession.findFirstOrThrow>>;
type DbCrawlStatus = DbCrawlSession["status"];
type DbCrawlTriggerType = DbCrawlSession["triggerType"];

const mapSession = (session: DbCrawlSession): CrawlSessionData => ({
    id: session.id,
    appVersionId: session.appVersionId,
    status: fromDbCrawlStatus(session.status),
    triggerType: fromDbCrawlTriggerType(session.triggerType),
    crawlConfig: (() => {
        const parsed = CrawlConfigSchema.safeParse(session.config);
        return parsed.success ? parsed.data : undefined;
    })(),
    stateCount: session.stateCount,
    transitionCount: session.transitionCount,
    createdAt: session.createdAt.toISOString(),
    startedAt: toIso(session.startedAt),
    finishedAt: toIso(session.finishedAt),
    errorMessage: session.error ?? undefined,
});

export async function getSessions(
    versionId: string,
    query: GetSessionsQuery
): Promise<ApplicationVersionCrawlSessionsResponse> {
    const { page, pageSize, status, triggerType } = query;
    const dbStatus = toDbCrawlStatusFilter<DbCrawlStatus>(status);
    const dbTriggerType = toDbCrawlTriggerTypeFilter<DbCrawlTriggerType>(triggerType);
    const [sessions, totalCount] = await Promise.all([
        prisma.crawlSession.findMany({
            where: {
                appVersionId: versionId,
                status: dbStatus,
                triggerType: dbTriggerType,
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.crawlSession.count({
            where: {
                appVersionId: versionId,
                status: dbStatus,
                triggerType: dbTriggerType,
            }
        })
    ]);

    return {
        sessions: sessions.map(mapSession),
        totalCount: totalCount,
        currentPage: page,
        pageSize: pageSize,
    };
}

export async function createSession(
    versionId: string,
    triggerType: CrawlTriggerType,
    crawlConfig: CrawlConfig,
): Promise<CrawlSessionData> {
    const parsedConfig = CrawlConfigSchema.parse(crawlConfig);
    const persistedConfig = {
        maxStates: parsedConfig.maxStates,
        maxDepth: parsedConfig.maxDepth,
        includeUrlPatterns: parsedConfig.includeUrlPatterns,
        excludeUrlPatterns: parsedConfig.excludeUrlPatterns,
        enableSemanticDecisions: parsedConfig.enableSemanticDecisions,
        headless: parsedConfig.headless,
        timeoutSeconds: parsedConfig.timeoutSeconds,
        crawlerSettings: parsedConfig.crawlerSettings,
        inputDefaults: parsedConfig.inputDefaults,
    };

    const newSession = await prisma.crawlSession.create({
        data: {
            appVersionId: versionId,
            triggerType: toDbCrawlTriggerType(triggerType) as unknown as DbCrawlTriggerType,
            config: persistedConfig,
        }
    });
    return mapSession(newSession);
}

export async function getSessionDetails(sessionId: string): Promise<CrawlSessionData> {
    const session = await prisma.crawlSession.findUniqueOrThrow({
        where: { id: sessionId }
    });
    return mapSession(session);
}

export async function deleteSession(sessionId: string): Promise<void> {
    await removeCrawlJob(sessionId);
    await prisma.crawlSession.delete({
        where: { id: sessionId }
    });
}

export async function startSession(sessionId: string): Promise<void> {
    const session = await prisma.crawlSession.findUniqueOrThrow({
        where: { id: sessionId }
    });

    if (session.status === PrismaCrawlStatus.NEW) {
        await prisma.crawlSession.update({
            where: { id: sessionId },
            data: { status: PrismaCrawlStatus.QUEUED }
        });

        try {
            await addCrawlJob(sessionId);
        } catch (error) {
            await prisma.crawlSession.update({
                where: { id: sessionId },
                data: { status: PrismaCrawlStatus.NEW }
            });
            throw error;
        }

        return;
    }

    if (session.status === PrismaCrawlStatus.PAUSED) {
        await prisma.crawlSession.update({
            where: { id: sessionId },
            data: { status: PrismaCrawlStatus.RUNNING }
        });
        return;
    }

    throw new Error(`Cannot start session with status ${session.status}`);
};

export async function abortSession(sessionId: string): Promise<void> {
    const session = await prisma.crawlSession.findUniqueOrThrow({
        where: { id: sessionId }
    });

    if (session.status !== PrismaCrawlStatus.RUNNING && session.status !== PrismaCrawlStatus.PAUSED
        && session.status !== PrismaCrawlStatus.QUEUED) {
        throw new Error(`Cannot abort session with status ${session.status}`);
    }

    await prisma.crawlSession.update({
        where: { id: sessionId },
        data: { status: PrismaCrawlStatus.ABORTED }
    });

    if (session.status === PrismaCrawlStatus.QUEUED) {
        await removeCrawlJob(sessionId);
    }
};

export async function pauseSession(sessionId: string): Promise<void> {
    const session = await prisma.crawlSession.findUniqueOrThrow({
        where: { id: sessionId }
    });

    if (session.status !== PrismaCrawlStatus.RUNNING) {
        throw new Error(`Cannot pause session with status ${session.status}`);
    }

    await prisma.crawlSession.update({
        where: { id: sessionId },
        data: { status: PrismaCrawlStatus.PAUSED }
    });
};
