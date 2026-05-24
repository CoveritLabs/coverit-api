// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import {
  CrawlTriggerType,
  CrawlStatus,
  type CrawlConfig as ContractCrawlConfig,
  type CrawlerRunSettings as ContractCrawlerRunSettings,
  type InputDefaultsConfig as ContractInputDefaultsConfig,
  type CreateCrawlSessionRequest as ContractCreateCrawlSessionRequest,
  type CrawlSessionData as ContractCrawlSessionData,
  type ApplicationVersionCrawlSessionsResponse as ContractApplicationVersionCrawlSessionsResponse,
  type CrawlSessionByIDResponse as ContractCrawlSessionByIDResponse,
  type StopCrawlSessionResponse as ContractStopCrawlSessionResponse,
} from "@coveritlabs/contracts";
import { DEFAULT_CRAWL_CONFIG } from "@constants/crawlConfig";
import { z } from "@utils/zod";
import type { infer as ZodInfer, ZodType } from "zod";
import type { Plain } from "./common";

export type CrawlerRunSettings = Plain<ContractCrawlerRunSettings>;
export type InputDefaultsConfig = Plain<ContractInputDefaultsConfig>;
export type CrawlConfig = Plain<ContractCrawlConfig>;
export type CreateCrawlSessionRequest = Plain<ContractCreateCrawlSessionRequest>;
export type CrawlSessionData = Plain<ContractCrawlSessionData>;
export type ApplicationVersionCrawlSessionsResponse = Plain<ContractApplicationVersionCrawlSessionsResponse>;
export type CrawlSessionByIDResponse = Plain<ContractCrawlSessionByIDResponse>;
export type StopCrawlSessionResponse = Plain<ContractStopCrawlSessionResponse>;
export type GetSessionsQuery = ZodInfer<typeof GetSessionsQuerySchema>;
export { CrawlTriggerType, CrawlStatus };

export const CrawlerRunSettingsSchema = z.object({
  headless: z.boolean().optional(),
  timeoutMs: z.number().int().min(1).max(86400_000).optional(),
  maxStates: z.number().int().min(1).max(100_000).optional(),
  maxTransitions: z.number().int().min(1).max(1_000_000).optional(),
  maxElementsPerState: z.number().int().min(1).max(10_000).optional(),
  maxSelectOptionsPerElement: z.number().int().min(1).max(1_000).optional(),
  maxActionRepeatsPerUrl: z.number().int().min(0).max(1_000).optional(),
  actionRetryCount: z.number().int().min(0).max(100).optional(),
  replayRetryCount: z.number().int().min(0).max(100).optional(),
  popupTimeoutMs: z.number().int().min(1).max(86400_000).optional(),
  domQuietMs: z.number().int().min(0).max(600_000).optional(),
  domSettleTimeoutMs: z.number().int().min(1).max(86400_000).optional(),
  useDomQuiescence: z.boolean().optional(),
  pageLoadState: z.string().min(1).max(100).optional(),
  clickNonHttpLinks: z.boolean().optional(),
  deferDestructiveActions: z.boolean().optional(),
  destructiveKeywords: z.string().max(5_000).optional(),
}) satisfies ZodType<CrawlerRunSettings>;

export const InputDefaultsConfigSchema = z.object({
  fieldPatterns: z.record(z.string(), z.string()),
  typeFallbacks: z.record(z.string(), z.string()),
}) satisfies ZodType<InputDefaultsConfig>;

export const CrawlConfigSchema = z
  .object({
    maxStates: z.number().int().min(1).max(100_000).default(DEFAULT_CRAWL_CONFIG.maxStates),
    maxDepth: z.number().int().min(1).max(1_000).default(DEFAULT_CRAWL_CONFIG.maxDepth),
    includeUrlPatterns: z.array(z.string().min(1).max(2048)).max(100).default(DEFAULT_CRAWL_CONFIG.includeUrlPatterns),
    excludeUrlPatterns: z.array(z.string().min(1).max(2048)).max(100).default(DEFAULT_CRAWL_CONFIG.excludeUrlPatterns),
    enableSemanticDecisions: z.boolean().default(DEFAULT_CRAWL_CONFIG.enableSemanticDecisions),
    timeoutSeconds: z.number().int().min(1).max(86400).default(DEFAULT_CRAWL_CONFIG.timeoutSeconds),
    crawlerSettings: CrawlerRunSettingsSchema.optional(),
    inputDefaults: InputDefaultsConfigSchema.optional(),
  })
  .loose() satisfies ZodType<CrawlConfig>;

export const CreateCrawlSessionRequestSchema = z.object({
  triggerType: z.enum(CrawlTriggerType),
  crawlConfig: CrawlConfigSchema.optional().default(() => ({ ...DEFAULT_CRAWL_CONFIG })),
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
