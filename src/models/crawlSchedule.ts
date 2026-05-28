// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import {
  CrawlScheduleType,
  CrawlScheduleMode,
  type CreateCrawlScheduleRequest as ContractCreateCrawlScheduleRequest,
  type UpdateCrawlScheduleRequest as ContractUpdateCrawlScheduleRequest,
  type CrawlScheduleData as ContractCrawlScheduleData,
  type CrawlScheduleListResponse as ContractCrawlScheduleListResponse,
} from "@coveritlabs/contracts";
import { DEFAULT_CRAWL_CONFIG } from "@constants/crawlConfig";
import { z } from "@utils/zod";
import type { infer as ZodInfer, ZodType } from "zod";
import type { Plain } from "./common";
import { CodegenConfigSchema, type CodegenConfig, CrawlConfigSchema, type CrawlConfig } from "./crawlSession";
import { CRAWL_SCHEDULE_VALIDATION } from "@constants/messages/crawlSchedule";

export type CreateCrawlScheduleRequest = Plain<ContractCreateCrawlScheduleRequest>;
export type UpdateCrawlScheduleRequest = Plain<ContractUpdateCrawlScheduleRequest>;
export type CrawlScheduleData = Plain<ContractCrawlScheduleData>;
export type CrawlScheduleListResponse = Plain<ContractCrawlScheduleListResponse>;
export { CrawlScheduleType, CrawlScheduleMode };
export type CrawlScheduleInput = ZodInfer<typeof CreateCrawlScheduleRequestSchema>;
export { CodegenConfigSchema, CrawlConfigSchema };

const baseScheduleSchema = z.object({
  scheduleType: z.enum(CrawlScheduleType),
  mode: z.enum(CrawlScheduleMode),
  versionId: z.uuid().optional(),
  cron: z.string().max(200).optional(),
  timezone: z.string().max(100).optional(),
  runAt: z.string().max(40).optional(),
  isActive: z.boolean().optional(),
  catchUp: z.boolean().optional(),
  crawlConfig: CrawlConfigSchema.optional(),
  codegenConfig: CodegenConfigSchema.optional(),
  regressionCodebaseId: z.uuid().optional(),
}) satisfies ZodType<Partial<CreateCrawlScheduleRequest>>;

export const CreateCrawlScheduleRequestSchema = baseScheduleSchema
  .extend({
    mode: z.enum(CrawlScheduleMode).default(CrawlScheduleMode.LATEST_VERSION),
    crawlConfig: CrawlConfigSchema.optional().default(() => ({ ...DEFAULT_CRAWL_CONFIG })),
  })
  .superRefine((value, ctx) => {
    if (value.scheduleType === CrawlScheduleType.ONCE) {
      if (!value.runAt) {
        ctx.addIssue({ code: "custom", message: CRAWL_SCHEDULE_VALIDATION.ONE_TIME_SCHEDULE_RUN_AT_REQUIRED });
      }
    }

    if (value.scheduleType === CrawlScheduleType.CRON) {
      if (!value.cron) {
        ctx.addIssue({ code: "custom", message: CRAWL_SCHEDULE_VALIDATION.CRON_SCHEDULE_CRON_REQUIRED });
      }
    }

    if (value.mode === CrawlScheduleMode.FIXED_VERSION && !value.versionId) {
      ctx.addIssue({ code: "custom", message: CRAWL_SCHEDULE_VALIDATION.FIXED_VERSION_SCHEDULE_VERSION_ID_REQUIRED });
    }
  }) satisfies ZodType<CreateCrawlScheduleRequest>;

export const UpdateCrawlScheduleRequestSchema = baseScheduleSchema.partial().superRefine((value, ctx) => {
  if (value.scheduleType === CrawlScheduleType.ONCE && !value.runAt) {
    ctx.addIssue({ code: "custom", message: CRAWL_SCHEDULE_VALIDATION.ONE_TIME_SCHEDULE_RUN_AT_REQUIRED });
  }

  if (value.scheduleType === CrawlScheduleType.CRON && !value.cron) {
    ctx.addIssue({ code: "custom", message: CRAWL_SCHEDULE_VALIDATION.CRON_SCHEDULE_CRON_REQUIRED });
  }

  if (value.mode === CrawlScheduleMode.FIXED_VERSION && !value.versionId) {
    ctx.addIssue({ code: "custom", message: CRAWL_SCHEDULE_VALIDATION.FIXED_VERSION_SCHEDULE_VERSION_ID_REQUIRED });
  }
}) satisfies ZodType<UpdateCrawlScheduleRequest>;

export type { CrawlConfig, CodegenConfig };
