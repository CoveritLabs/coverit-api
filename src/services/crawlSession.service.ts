// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import {
    type CrawlConfig,
    CrawlConfigSchema,
    CrawlStatus,
    CrawlTriggerType,
    type ApplicationVersionCrawlSessionsResponse,
    type CrawlSessionData,
    type GetSessionsQuery,
} from "@models/crawlSession";
import { removeCrawlJob, addCrawlJob } from "@queues/crawl.queue";


type DbCrawlSession = Awaited<ReturnType<typeof prisma.crawlSession.findFirstOrThrow>>;

const toIso = (value: Date | null): string | undefined => (value ? value.toISOString() : undefined);

const toEnumValue = <T extends Record<string, string | number>>(
    enumObject: T,
    raw: string,
    fallback: T[keyof T],
): T[keyof T] => {
    const value = enumObject[raw as keyof T];
    return typeof value === "number" ? value : fallback;
};

const crawlStatusToDb = (status?: CrawlStatus): string | undefined => {
    if (status === undefined || status === CrawlStatus.UNSPECIFIED) {
        return undefined;
    }
    return CrawlStatus[status];
};

const crawlTriggerTypeToDb = (triggerType?: CrawlTriggerType): string | undefined => {
    if (triggerType === undefined || triggerType === CrawlTriggerType.UNSPECIFIED) {
        return undefined;
    }
    return CrawlTriggerType[triggerType];
};

const mapSession = (session: DbCrawlSession): CrawlSessionData => ({
    id: session.id,
    appVersionId: session.appVersionId,
    status: toEnumValue(CrawlStatus, session.status, CrawlStatus.UNSPECIFIED) as CrawlStatus,
    triggerType: toEnumValue(CrawlTriggerType, session.triggerType, CrawlTriggerType.UNSPECIFIED) as CrawlTriggerType,
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
    const dbStatus = crawlStatusToDb(status);
    const dbTriggerType = crawlTriggerTypeToDb(triggerType);
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
    };

    const newSession = await prisma.crawlSession.create({
        data: {
            appVersionId: versionId,
            triggerType: CrawlTriggerType[triggerType],
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

    if (session.status === CrawlStatus[CrawlStatus.NEW]) {
        await prisma.crawlSession.update({
            where: { id: sessionId },
            data: { status: CrawlStatus[CrawlStatus.QUEUED] }
        });

        try {
            await addCrawlJob(sessionId);
        } catch (error) {
            await prisma.crawlSession.update({
                where: { id: sessionId },
                data: { status: CrawlStatus[CrawlStatus.NEW] }
            });
            throw error;
        }

        return;
    }

    if (session.status === CrawlStatus[CrawlStatus.PAUSED]) {
        await prisma.crawlSession.update({
            where: { id: sessionId },
            data: { status: CrawlStatus[CrawlStatus.RUNNING] }
        });
        return;
    }

    throw new Error(`Cannot start session with status ${session.status}`);
};

export async function abortSession(sessionId: string): Promise<void> {
    const session = await prisma.crawlSession.findUniqueOrThrow({
        where: { id: sessionId }
    });

    if (session.status !== CrawlStatus[CrawlStatus.RUNNING] && session.status !== CrawlStatus[CrawlStatus.PAUSED]
        && session.status !== CrawlStatus[CrawlStatus.QUEUED]) {
        throw new Error(`Cannot abort session with status ${session.status}`);
    }

    if (session.status === CrawlStatus[CrawlStatus.QUEUED]) {
        await removeCrawlJob(sessionId);
    }

    await prisma.crawlSession.update({
        where: { id: sessionId },
        data: { status: CrawlStatus[CrawlStatus.ABORTED] }
    });
};

export async function pauseSession(sessionId: string): Promise<void> {
    const session = await prisma.crawlSession.findUniqueOrThrow({
        where: { id: sessionId }
    });

    if (session.status !== CrawlStatus[CrawlStatus.RUNNING]) {
        throw new Error(`Cannot pause session with status ${session.status}`);
    }

    await prisma.crawlSession.update({
        where: { id: sessionId },
        data: { status: CrawlStatus[CrawlStatus.PAUSED] }
    });
};
