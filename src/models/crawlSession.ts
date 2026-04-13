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

export type CrawlConfig = Plain<ContractCrawlConfig>;
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
}) satisfies ZodType<CrawlConfig>;

export const CreateCrawlSessionRequestSchema = z.object({
    triggerType: z.enum(CrawlTriggerType),
    crawlConfig: CrawlConfigSchema,
}) satisfies ZodType<CreateCrawlSessionRequest>;

export const AppVersionParamsSchema = z.object({
    app_version_id: z.uuid(),
});

export const CrawlSessionParamsSchema = z.object({
    crawl_session_id: z.uuid(),
});

export const GetSessionsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    status: z.enum(CrawlStatus).optional(),
    triggerType: z.enum(CrawlTriggerType).optional(),
});




