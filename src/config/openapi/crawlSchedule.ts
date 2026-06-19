// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import {
  CodegenConfigSchema,
  CrawlConfigSchema,
  CrawlScheduleMode,
  CrawlScheduleType,
  CreateCrawlScheduleRequestSchema,
  UpdateCrawlScheduleRequestSchema,
} from "@models/crawlSchedule";
import { z } from "@utils/zod";
import { registry } from "./registry";

const MessageResponseSchema = z.object({ message: z.string() });
const ErrorResponseSchema = z.object({ message: z.string() });

const CrawlScheduleResponseSchema = z.object({
  id: z.string(),
  targetApplicationId: z.string(),
  scheduleType: z.enum(CrawlScheduleType),
  mode: z.enum(CrawlScheduleMode),
  versionId: z.string().optional(),
  cron: z.string().optional(),
  timezone: z.string().optional(),
  runAt: z.string().optional(),
  isActive: z.boolean(),
  catchUp: z.boolean(),
  crawlConfig: CrawlConfigSchema,
  codegenConfig: CodegenConfigSchema.optional(),
  regressionCodebaseId: z.string().optional(),
  nextRunAt: z.string().optional(),
  lastRunAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CrawlScheduleListResponseSchema = z.object({
  schedules: z.array(CrawlScheduleResponseSchema),
});

registry.register("CreateCrawlScheduleRequest", CreateCrawlScheduleRequestSchema);
registry.register("UpdateCrawlScheduleRequest", UpdateCrawlScheduleRequestSchema);
registry.register("CrawlScheduleResponse", CrawlScheduleResponseSchema);
registry.register("CrawlScheduleListResponse", CrawlScheduleListResponseSchema);
registry.register("CrawlScheduleMessageResponse", MessageResponseSchema);
registry.register("CrawlScheduleErrorResponse", ErrorResponseSchema);

const appParams = [
  { name: "projectId", in: "path", required: true, schema: { type: "string" } },
  { name: "appId", in: "path", required: true, schema: { type: "string" } },
] as const;

const scheduleParams = [...appParams, { name: "scheduleId", in: "path", required: true, schema: { type: "string" } }] as const;

type JsonSchema = typeof MessageResponseSchema | typeof ErrorResponseSchema | typeof CrawlScheduleResponseSchema | typeof CrawlScheduleListResponseSchema;
type JsonContent = { "application/json": { schema: JsonSchema } };

const json = (schema: JsonSchema): JsonContent => ({
  "application/json": { schema },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/crawl-schedules",
  tags: ["CrawlSchedule"],
  summary: "List crawl schedules",
  security: [{ bearerAuth: [] }],
  parameters: [...appParams],
  responses: {
    200: { description: "Crawl schedules", content: json(CrawlScheduleListResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/projects/{projectId}/target-applications/{appId}/crawl-schedules",
  tags: ["CrawlSchedule"],
  summary: "Create crawl schedule",
  security: [{ bearerAuth: [] }],
  parameters: [...appParams],
  request: { body: { content: { "application/json": { schema: CreateCrawlScheduleRequestSchema } } } },
  responses: {
    201: { description: "Crawl schedule created", content: json(CrawlScheduleResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/crawl-schedules/{scheduleId}",
  tags: ["CrawlSchedule"],
  summary: "Get crawl schedule",
  security: [{ bearerAuth: [] }],
  parameters: [...scheduleParams],
  responses: {
    200: { description: "Crawl schedule", content: json(CrawlScheduleResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "put",
  path: "/projects/{projectId}/target-applications/{appId}/crawl-schedules/{scheduleId}",
  tags: ["CrawlSchedule"],
  summary: "Update crawl schedule",
  security: [{ bearerAuth: [] }],
  parameters: [...scheduleParams],
  request: { body: { content: { "application/json": { schema: UpdateCrawlScheduleRequestSchema } } } },
  responses: {
    200: { description: "Crawl schedule updated", content: json(CrawlScheduleResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/projects/{projectId}/target-applications/{appId}/crawl-schedules/{scheduleId}",
  tags: ["CrawlSchedule"],
  summary: "Delete crawl schedule",
  security: [{ bearerAuth: [] }],
  parameters: [...scheduleParams],
  responses: {
    200: { description: "Deleted", content: json(MessageResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});
