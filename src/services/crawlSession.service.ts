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
import { CrawlerJobPayload } from "types/crawler";
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

    if (session.status === PrismaCrawlStatus.QUEUED) {
        await removeCrawlJob(sessionId);
    }

    await prisma.crawlSession.update({
        where: { id: sessionId },
        data: { status: PrismaCrawlStatus.ABORTED }
    });
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

export async function markQueuedSessionRunning(sessionId: string): Promise<void> {
    const result = await prisma.crawlSession.updateMany({
        where: {
            id: sessionId,
            status: PrismaCrawlStatus.QUEUED,
        },
        data: {
            status: PrismaCrawlStatus.RUNNING,
            startedAt: new Date(),
        },
    });

    if (result.count === 1) return;

    const session = await prisma.crawlSession.findUniqueOrThrow({
        where: { id: sessionId },
    });
    throw new Error(`Cannot start session with status ${session.status}`);
}

export async function markSessionCompleted(sessionId: string): Promise<void> {
    await prisma.crawlSession.update({
        where: { id: sessionId },
        data: {
            status: PrismaCrawlStatus.COMPLETED,
            finishedAt: new Date(),
            error: null,
        },
    });
}

export async function markSessionFailed(sessionId: string, errorMessage: string): Promise<void> {
    await prisma.crawlSession.update({
        where: { id: sessionId },
        data: {
            status: PrismaCrawlStatus.FAILED,
            finishedAt: new Date(),
            error: errorMessage,
        },
    });
}

export async function isSessionAborted(sessionId: string): Promise<boolean> {
    const session = await prisma.crawlSession.findUnique({
        where: { id: sessionId },
        select: { status: true },
    });
    return session?.status === PrismaCrawlStatus.ABORTED;
}

export async function markSessionCompletedIfRunning(sessionId: string): Promise<boolean> {
    const result = await prisma.crawlSession.updateMany({
        where: {
            id: sessionId,
            status: PrismaCrawlStatus.RUNNING,
        },
        data: {
            status: PrismaCrawlStatus.COMPLETED,
            finishedAt: new Date(),
            error: null,
        },
    });
    return result.count === 1;
}

export async function markSessionFailedIfRunning(sessionId: string, errorMessage: string): Promise<boolean> {
    const result = await prisma.crawlSession.updateMany({
        where: {
            id: sessionId,
            status: PrismaCrawlStatus.RUNNING,
        },
        data: {
            status: PrismaCrawlStatus.FAILED,
            finishedAt: new Date(),
            error: errorMessage,
        },
    });
    return result.count === 1;
}

export async function markSessionFinishedAtIfAborted(sessionId: string): Promise<void> {
    await prisma.crawlSession.updateMany({
        where: {
            id: sessionId,
            status: PrismaCrawlStatus.ABORTED,
            finishedAt: null,
        },
        data: {
            finishedAt: new Date(),
        },
    });
}

export async function getCrawlerJobPayload(sessionId: string): Promise<CrawlerJobPayload> {
    const session = await prisma.crawlSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: {
            appVersion: {
                include: {
                    targetApplication: true,
                },
            },
        },
    });

    const parsed = CrawlConfigSchema.safeParse(session.config);
    const crawlConfig = parsed.success ? parsed.data : undefined;

    const settings = {
        headless: crawlConfig?.crawlerSettings?.headless ?? crawlConfig?.headless,
        timeout_ms: crawlConfig?.crawlerSettings?.timeout_ms ?? (crawlConfig?.timeoutSeconds ? crawlConfig.timeoutSeconds * 1000 : undefined),
        max_states: crawlConfig?.crawlerSettings?.max_states ?? crawlConfig?.maxStates,
        max_transitions: crawlConfig?.crawlerSettings?.max_transitions,
        max_elements_per_state: crawlConfig?.crawlerSettings?.max_elements_per_state,
        max_select_options_per_element: crawlConfig?.crawlerSettings?.max_select_options_per_element,
        max_action_repeats_per_url: crawlConfig?.crawlerSettings?.max_action_repeats_per_url,
        action_retry_count: crawlConfig?.crawlerSettings?.action_retry_count,
        replay_retry_count: crawlConfig?.crawlerSettings?.replay_retry_count,
        popup_timeout_ms: crawlConfig?.crawlerSettings?.popup_timeout_ms,
        dom_quiet_ms: crawlConfig?.crawlerSettings?.dom_quiet_ms,
        dom_settle_timeout_ms: crawlConfig?.crawlerSettings?.dom_settle_timeout_ms,
        use_dom_quiescence: crawlConfig?.crawlerSettings?.use_dom_quiescence,
        page_load_state: crawlConfig?.crawlerSettings?.page_load_state,
        click_non_http_links: crawlConfig?.crawlerSettings?.click_non_http_links,
        defer_destructive_actions: crawlConfig?.crawlerSettings?.defer_destructive_actions,
        destructive_keywords: crawlConfig?.crawlerSettings?.destructive_keywords,
    };

    return {
        base_url: session.appVersion.targetApplication.baseUrl,
        session_id: sessionId,
        settings,
        input_defaults: crawlConfig?.inputDefaults,
    };
}
