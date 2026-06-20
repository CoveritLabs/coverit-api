// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import { registry } from "./registry";
import {
  CodegenConfigSchema,
  CrawlConfigSchema,
  CrawlStatus,
  CrawlTriggerType,
  CreateCrawlSessionRequestSchema,
  GetSessionsQuerySchema,
} from "@models/crawlSession";

const MessageResponseSchema = z.object({ message: z.string() });
const ErrorResponseSchema = z.object({ message: z.string() });

const CrawlSessionResponseSchema = z.object({
  id: z.string(),
  appVersionId: z.string(),
  status: z.enum(CrawlStatus),
  triggerType: z.enum(CrawlTriggerType),
  crawlConfig: CrawlConfigSchema,
  codegenConfig: CodegenConfigSchema.optional(),
  regressionCodebaseId: z.string().optional(),
  baseUrlSnapshot: z.string().optional(),
  scheduleId: z.string().optional(),
  stateCount: z.number(),
  transitionCount: z.number(),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  errorMessage: z.string().optional(),
});

const CrawlSessionListResponseSchema = z.object({
  sessions: z.array(CrawlSessionResponseSchema),
  totalCount: z.number(),
  currentPage: z.number(),
  pageSize: z.number(),
});

registry.register("CrawlConfig", CrawlConfigSchema);
registry.register("CrawlerCodegenConfig", CodegenConfigSchema);
registry.register("CreateCrawlSessionRequest", CreateCrawlSessionRequestSchema);
registry.register("CrawlSessionResponse", CrawlSessionResponseSchema);
registry.register("CrawlSessionListResponse", CrawlSessionListResponseSchema);
registry.register("CrawlerMessageResponse", MessageResponseSchema);
registry.register("CrawlerErrorResponse", ErrorResponseSchema);

const versionParams = [
  { name: "projectId", in: "path", required: true, schema: { type: "string" } },
  { name: "appId", in: "path", required: true, schema: { type: "string" } },
  { name: "versionId", in: "path", required: true, schema: { type: "string" } },
] as const;

const sessionParams = [
  ...versionParams,
  { name: "crawlSessionId", in: "path", required: true, schema: { type: "string" } },
] as const;

type JsonSchema = typeof MessageResponseSchema | typeof ErrorResponseSchema | typeof CrawlSessionResponseSchema | typeof CrawlSessionListResponseSchema;
type JsonContent = { "application/json": { schema: JsonSchema } };

const json = (schema: JsonSchema): JsonContent => ({
  "application/json": { schema },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}/crawl-sessions",
  tags: ["CrawlSession"],
  summary: "List crawl sessions",
  security: [{ bearerAuth: [] }],
  parameters: [...versionParams],
  request: { query: GetSessionsQuerySchema },
  responses: {
    200: { description: "Crawl sessions", content: json(CrawlSessionListResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}/crawl-sessions",
  tags: ["CrawlSession"],
  summary: "Create a crawl session",
  security: [{ bearerAuth: [] }],
  parameters: [...versionParams],
  request: { body: { content: { "application/json": { schema: CreateCrawlSessionRequestSchema } } } },
  responses: {
    201: { description: "Crawl session created", content: json(CrawlSessionResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}/crawl-sessions/{crawlSessionId}",
  tags: ["CrawlSession"],
  summary: "Get crawl session",
  security: [{ bearerAuth: [] }],
  parameters: [...sessionParams],
  responses: {
    200: { description: "Crawl session", content: json(CrawlSessionResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}/crawl-sessions/{crawlSessionId}",
  tags: ["CrawlSession"],
  summary: "Delete crawl session",
  security: [{ bearerAuth: [] }],
  parameters: [...sessionParams],
  responses: {
    200: { description: "Deleted", content: json(MessageResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "put",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}/crawl-sessions/{crawlSessionId}/start",
  tags: ["CrawlSession"],
  summary: "Start or resume crawl session",
  security: [{ bearerAuth: [] }],
  parameters: [...sessionParams],
  responses: {
    200: { description: "Started or resumed", content: json(MessageResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
    409: { description: "Invalid crawl session status", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "put",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}/crawl-sessions/{crawlSessionId}/pause",
  tags: ["CrawlSession"],
  summary: "Pause crawl session",
  security: [{ bearerAuth: [] }],
  parameters: [...sessionParams],
  responses: {
    200: { description: "Paused", content: json(MessageResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
    409: { description: "Invalid crawl session status", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "put",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}/crawl-sessions/{crawlSessionId}/abort",
  tags: ["CrawlSession"],
  summary: "Abort crawl session",
  security: [{ bearerAuth: [] }],
  parameters: [...sessionParams],
  responses: {
    200: { description: "Aborted", content: json(MessageResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
    409: { description: "Invalid crawl session status", content: json(ErrorResponseSchema) },
  },
});
