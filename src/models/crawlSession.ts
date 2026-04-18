// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// CrawlSession domain DTOs

import {
    CrawlTriggerType,
    CrawlStatus,
    type CrawlConfig as ContractCrawlConfig,
    type CreateCrawlSessionRequest as ContractCreateCrawlSessionRequest,
    type CrawlSessionData as ContractCrawlSessionData,
    type ApplicationVersionCrawlSessionsResponse as ContractApplicationVersionCrawlSessionsResponse,
    type CrawlSessionByIDResponse as ContractCrawlSessionByIDResponse,
    type StopCrawlSessionResponse as ContractStopCrawlSessionResponse,
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { infer as ZodInfer, ZodType } from "zod";
import type { Plain } from "./common";
import { type InputDefaultsConfig, type CrawlerRunSettings } from "types/crawler";

export type CrawlConfig = Plain<ContractCrawlConfig> & {
    crawlerSettings?: CrawlerRunSettings;
    inputDefaults?: InputDefaultsConfig;
};
export type CreateCrawlSessionRequest = Omit<Plain<ContractCreateCrawlSessionRequest>, "crawlConfig"> & {
    crawlConfig: CrawlConfig;
};
export type CrawlSessionData = Omit<Plain<ContractCrawlSessionData>, "crawlConfig"> & {
    crawlConfig: CrawlConfig;
};
export type ApplicationVersionCrawlSessionsResponse = Plain<ContractApplicationVersionCrawlSessionsResponse>;
export type CrawlSessionByIDResponse = Plain<ContractCrawlSessionByIDResponse>;
export type StopCrawlSessionResponse = Plain<ContractStopCrawlSessionResponse>;
export type GetSessionsQuery = ZodInfer<typeof GetSessionsQuerySchema>;
export { CrawlTriggerType, CrawlStatus };


function normalizeCrawlerSettings(input: unknown): unknown {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
    const src = input as Record<string, unknown>;

    const mapped: Record<string, unknown> = { ...src };
    const remap = (from: string, to: string) => {
        if (mapped[from] !== undefined && mapped[to] === undefined) {
            mapped[to] = mapped[from];
        }
    };

    remap('timeout_ms', 'timeoutMs');
    remap('max_states', 'maxStates');
    remap('max_transitions', 'maxTransitions');
    remap('max_elements_per_state', 'maxElementsPerState');
    remap('max_select_options_per_element', 'maxSelectOptionsPerElement');
    remap('max_action_repeats_per_url', 'maxActionRepeatsPerUrl');
    remap('action_retry_count', 'actionRetryCount');
    remap('replay_retry_count', 'replayRetryCount');
    remap('popup_timeout_ms', 'popupTimeoutMs');
    remap('dom_quiet_ms', 'domQuietMs');
    remap('dom_settle_timeout_ms', 'domSettleTimeoutMs');
    remap('use_dom_quiescence', 'useDomQuiescence');
    remap('page_load_state', 'pageLoadState');
    remap('click_non_http_links', 'clickNonHttpLinks');
    remap('defer_destructive_actions', 'deferDestructiveActions');
    remap('destructive_keywords', 'destructiveKeywords');

    return mapped;
}

function normalizeInputDefaults(input: unknown): unknown {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
    const src = input as Record<string, unknown>;
    const mapped: Record<string, unknown> = { ...src };

    if (mapped.field_patterns !== undefined && mapped.fieldPatterns === undefined) {
        mapped.fieldPatterns = mapped.field_patterns;
    }
    if (mapped.type_fallbacks !== undefined && mapped.typeFallbacks === undefined) {
        mapped.typeFallbacks = mapped.type_fallbacks;
    }
    return mapped;
}


export const CrawlConfigSchema = z.object({
    crawlerSettings: z
        .preprocess(
            normalizeCrawlerSettings,
            z.object({
            headless: z.boolean().optional(),
            timeoutMs: z.number().int().min(1).max(86400_000).optional(),
            maxStates: z.number().int().min(1).max(100000).optional(),
            maxTransitions: z.number().int().min(1).max(1_000_000).optional(),
            maxElementsPerState: z.number().int().min(1).max(10000).optional(),
            maxSelectOptionsPerElement: z.number().int().min(1).max(1000).optional(),
            maxActionRepeatsPerUrl: z.number().int().min(0).max(1000).optional(),
            actionRetryCount: z.number().int().min(0).max(100).optional(),
            replayRetryCount: z.number().int().min(0).max(100).optional(),
            popupTimeoutMs: z.number().int().min(1).max(86400_000).optional(),
            domQuietMs: z.number().int().min(0).max(600_000).optional(),
            domSettleTimeoutMs: z.number().int().min(1).max(86400_000).optional(),
            useDomQuiescence: z.boolean().optional(),
            pageLoadState: z.string().min(1).max(100).optional(),
            clickNonHttpLinks: z.boolean().optional(),
            deferDestructiveActions: z.boolean().optional(),
            destructiveKeywords: z.string().min(0).max(5000).optional(),
        })
        )
        .optional(),
    inputDefaults: z
        .preprocess(
            normalizeInputDefaults,
            z.object({
            fieldPatterns: z.record(z.string(), z.string()),
            typeFallbacks: z.record(z.string(), z.string()),
        })
        )
        .optional(),
}).loose() satisfies ZodType<CrawlConfig>;

export const CreateCrawlSessionRequestSchema = z.object({
    triggerType: z.enum(CrawlTriggerType),
    crawlConfig: CrawlConfigSchema.optional().default({}),
}) satisfies ZodType<CreateCrawlSessionRequest>;

export const AppVersionParamsSchema = z.object({
    versionId: z.uuid(),
});

export const CrawlSessionParamsSchema = z.object({
    crawlSessionId: z.uuid(),
});

export const GetSessionsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    status: z.enum(CrawlStatus).optional(),
    triggerType: z.enum(CrawlTriggerType).optional(),
});




