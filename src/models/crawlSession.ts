// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import {
  type CrawlerRunSettings as ContractCrawlerRunSettings,
  type CodegenConfig as ContractCodegenConfig,
} from "@coveritlabs/contracts";
import { DEFAULT_CRAWL_CONFIG } from "@constants/crawlConfig";
import { z } from "@utils/zod";
import type { infer as ZodInfer, ZodType } from "zod";
import type { Plain } from "./common";

export type CrawlerRunSettings = Plain<ContractCrawlerRunSettings>;
export type InputDefaultsConfig = {
  fieldPatterns: Record<string, string>;
  typeFallbacks: Record<string, string>;
};
export type CrawlConfig = {
  maxStates?: number;
  timeoutSeconds?: number;
  generateTestFlows?: boolean;
  crawlerSettings?: CrawlerRunSettings;
  inputDefaults?: InputDefaultsConfig;
};
export type CodegenConfig = Plain<ContractCodegenConfig>;
export type CreateCrawlSessionRequest = {
  triggerType: CrawlTriggerType;
  crawlConfig?: CrawlConfig;
  regressionCodebaseId?: string;
  codegenConfig?: CodegenConfig;
};
export type CrawlSessionData = {
  id: string;
  appVersionId: string;
  status: CrawlStatus;
  triggerType: CrawlTriggerType;
  crawlConfig: CrawlConfig;
  regressionCodebaseId?: string;
  codegenConfig?: CodegenConfig;
  baseUrlSnapshot?: string;
  scheduleId?: string;
  stateCount: number;
  transitionCount: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
};
export type ApplicationVersionCrawlSessionsResponse = {
  sessions: CrawlSessionData[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
};
export type CrawlSessionByIDResponse = {
  session: CrawlSessionData;
};
export type StopCrawlSessionResponse = {
  session: CrawlSessionData;
};
export type GetSessionsQuery = ZodInfer<typeof GetSessionsQuerySchema>;

export enum CrawlStatus {
  UNSPECIFIED = 0,
  QUEUED = 1,
  RUNNING = 2,
  COMPLETED = 3,
  FAILED = 4,
  ABORTED = 5,
  PAUSED = 6,
  NEW = 7,
}

export enum CrawlTriggerType {
  UNSPECIFIED = 0,
  MANUAL = 1,
  SCHEDULED = 2,
  CI_TRIGGER = 3,
  WEBHOOK = 4,
  ON_DEMAND = 5,
}

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
  useSemanticDiversity: z.boolean().optional(),
  semanticDiversityThreshold: z.number().min(0).max(1).optional(),
  semanticUncertaintyMargin: z.number().min(0).max(1).optional(),
  semanticMaxBankSize: z.number().int().min(1).max(1_000_000).optional(),
  semanticArtifactDir: z.string().min(1).max(2_000).optional(),
}) satisfies ZodType<CrawlerRunSettings>;

export const InputDefaultsConfigSchema = z.object({
  fieldPatterns: z.record(z.string(), z.string()),
  typeFallbacks: z.record(z.string(), z.string()),
}).strict() satisfies ZodType<InputDefaultsConfig>;

export const CrawlConfigSchema = z
  .object({
    maxStates: z.number().int().min(1).max(100_000).default(DEFAULT_CRAWL_CONFIG.maxStates),
    timeoutSeconds: z.number().int().min(1).max(86400).default(DEFAULT_CRAWL_CONFIG.timeoutSeconds),
    generateTestFlows: z.boolean().default(DEFAULT_CRAWL_CONFIG.generateTestFlows),
    crawlerSettings: CrawlerRunSettingsSchema.optional().default({}),
    inputDefaults: InputDefaultsConfigSchema.optional(),
  })
  .strict() satisfies ZodType<CrawlConfig>;

export const CodegenConfigSchema = z.object({
  codegenBranch: z.string().min(1).max(200),
  prTargetBranch: z.string().min(1).max(200),
  prTitle: z.string().max(200).optional(),
  prBody: z.string().max(5_000).optional(),
  prDraft: z.boolean().optional(),
}) satisfies ZodType<CodegenConfig>;

export const CreateCrawlSessionRequestSchema = z.object({
  triggerType: z.enum(CrawlTriggerType),
  crawlConfig: CrawlConfigSchema.optional().default(() => ({ ...DEFAULT_CRAWL_CONFIG })),
  regressionCodebaseId: z.uuid().optional(),
  codegenConfig: CodegenConfigSchema.optional(),
}) satisfies ZodType<CreateCrawlSessionRequest>;

export const AppParamsSchema = z.object({
  projectId: z.uuid(),
  appId: z.uuid(),
});

export const AppVersionParamsSchema = AppParamsSchema.extend({
  versionId: z.uuid(),
});

export const CrawlSessionParamsSchema = AppVersionParamsSchema.extend({
  crawlSessionId: z.uuid(),
});

export const GetSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(CrawlStatus).optional(),
  triggerType: z.enum(CrawlTriggerType).optional(),
});
