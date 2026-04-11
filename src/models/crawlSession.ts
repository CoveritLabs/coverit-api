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
export type CreateCrawlSessionRequest = Plain<ContractCreateCrawlSessionRequest>;
export type CrawlSessionData = Plain<ContractCrawlSessionData>;
export type ApplicationVersionCrawlSessionsResponse = Plain<ContractApplicationVersionCrawlSessionsResponse>;
export type CrawlSessionByIDResponse = Plain<ContractCrawlSessionByIDResponse>;
export type StopCrawlSessionResponse = Plain<ContractStopCrawlSessionResponse>;
export type GetSessionsQuery = ZodInfer<typeof GetSessionsQuerySchema>;
export { CrawlTriggerType, CrawlStatus };




export const CrawlConfigSchema = z.object({
    maxStates: z.number().int().min(1).max(100000),
    maxDepth: z.number().int().min(1).max(1000),
    includeUrlPatterns: z.array(z.string().min(1).max(2048)).max(100),
    excludeUrlPatterns: z.array(z.string().min(1).max(2048)).max(100),
    enableSemanticDecisions: z.boolean(),
    headless: z.boolean(),
    timeoutSeconds: z.number().int().min(1).max(86400),
    crawlerSettings: z
        .object({
            headless: z.boolean().optional(),
            timeout_ms: z.number().int().min(1).max(86400_000).optional(),
            max_states: z.number().int().min(1).max(100000).optional(),
            max_transitions: z.number().int().min(1).max(1_000_000).optional(),
            max_elements_per_state: z.number().int().min(1).max(10000).optional(),
            max_select_options_per_element: z.number().int().min(1).max(1000).optional(),
            max_action_repeats_per_url: z.number().int().min(0).max(1000).optional(),
            action_retry_count: z.number().int().min(0).max(100).optional(),
            replay_retry_count: z.number().int().min(0).max(100).optional(),
            popup_timeout_ms: z.number().int().min(1).max(86400_000).optional(),
            dom_quiet_ms: z.number().int().min(0).max(600_000).optional(),
            dom_settle_timeout_ms: z.number().int().min(1).max(86400_000).optional(),
            use_dom_quiescence: z.boolean().optional(),
            page_load_state: z.string().min(1).max(100).optional(),
            click_non_http_links: z.boolean().optional(),
            defer_destructive_actions: z.boolean().optional(),
            destructive_keywords: z.string().min(0).max(5000).optional(),
        })
        .optional(),
    inputDefaults: z
        .object({
            field_patterns: z.record(z.string(), z.string()),
            type_fallbacks: z.record(z.string(), z.string()),
        })
        .optional(),
}).loose() satisfies ZodType<CrawlConfig>;

export const CreateCrawlSessionRequestSchema = z.object({
    triggerType: z.nativeEnum(CrawlTriggerType),
    crawlConfig: CrawlConfigSchema,
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
    status: z.nativeEnum(CrawlStatus).optional(),
    triggerType: z.nativeEnum(CrawlTriggerType).optional(),
});




