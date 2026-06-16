// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import { registry } from "./registry";
import {
  RegressionCompleteBodySchema,
  RegressionArtifactListQuerySchema,
  RegressionEventListQuerySchema,
  RegressionEventsIngestBodySchema,
  RegressionRunListQuerySchema,
} from "@models/regressionRun";

const ErrorResponseSchema = z.object({ message: z.string() });
const MessageResponseSchema = z.object({ message: z.string() });
const RunSchema = z.object({
  id: z.string(),
  runId: z.string(),
  applicationId: z.string(),
  versionId: z.string().optional(),
  status: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  durationMs: z.number().optional(),
  passedCount: z.number(),
  failedCount: z.number(),
  warningCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const ScenarioSchema = z.object({
  id: z.string(),
  runId: z.string(),
  scenarioKey: z.string(),
  featureName: z.string().optional(),
  scenarioName: z.string().optional(),
  title: z.string().optional(),
  file: z.string().optional(),
  line: z.number().optional(),
  status: z.string(),
  passedCount: z.number(),
  failedCount: z.number(),
  warningCount: z.number(),
});
const EventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  scenarioId: z.string().optional(),
  type: z.string(),
  timestamp: z.string(),
  payload: z.unknown(),
});
const ArtifactSchema = z.object({
  id: z.string(),
  runId: z.string(),
  scenarioId: z.string().optional(),
  kind: z.string(),
  name: z.string(),
  data: z.unknown(),
  contentType: z.string().optional(),
  sizeBytes: z.number().optional(),
  storageProvider: z.string().optional(),
  storageUri: z.string().optional(),
  storagePath: z.string().optional(),
  checksumSha256: z.string().optional(),
  uploadStatus: z.string().optional(),
  uploadError: z.string().optional(),
  metadata: z.unknown().optional(),
  downloadUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

registry.registerComponent("securitySchemes", "coveritApiKey", {
  type: "apiKey",
  in: "header",
  name: "X-CoverIt-Api-Key",
});

registry.registerPath({
  method: "post",
  path: "/regression/runs/{runId}/events",
  tags: ["RegressionRuns"],
  summary: "Ingest regression run events",
  security: [{ coveritApiKey: [] }],
  parameters: [{ name: "runId", in: "path", required: true, schema: { type: "string" } }],
  request: { body: { content: { "application/json": { schema: RegressionEventsIngestBodySchema } } } },
  responses: {
    202: { description: "Accepted", content: { "application/json": { schema: MessageResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/regression/runs/{runId}/artifacts",
  tags: ["RegressionRuns"],
  summary: "Upload regression run artifact",
  security: [{ coveritApiKey: [] }],
  parameters: [{ name: "runId", in: "path", required: true, schema: { type: "string" } }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            applicationId: z.string(),
            versionId: z.string().optional(),
            scenarioKey: z.string().optional(),
            featureName: z.string().optional(),
            scenarioName: z.string().optional(),
            kind: z.string(),
            name: z.string(),
            relativePath: z.string(),
            metadata: z.string().optional(),
            file: z.any(),
          }),
        },
      },
    },
  },
  responses: {
    202: { description: "Accepted", content: { "application/json": { schema: z.object({ message: z.string(), artifact: ArtifactSchema }) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/regression/runs/{runId}/complete",
  tags: ["RegressionRuns"],
  summary: "Complete regression run",
  security: [{ coveritApiKey: [] }],
  parameters: [{ name: "runId", in: "path", required: true, schema: { type: "string" } }],
  request: { body: { content: { "application/json": { schema: RegressionCompleteBodySchema } } } },
  responses: {
    200: { description: "Completed", content: { "application/json": { schema: MessageResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/runs",
  tags: ["RegressionRuns"],
  summary: "List application regression runs",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "versionId", in: "query", required: false, schema: { type: "string" } },
    { name: "status", in: "query", required: false, schema: { type: "string", enum: ["running", "passed", "failed"] } },
    { name: "limit", in: "query", required: false, schema: { type: "integer" } },
    { name: "cursor", in: "query", required: false, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Runs", content: { "application/json": { schema: z.object({ runs: z.array(RunSchema), nextCursor: z.string().optional() }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/runs/{runId}",
  tags: ["RegressionRuns"],
  summary: "Get regression run",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "runId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Run", content: { "application/json": { schema: RunSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/runs/{runId}/scenarios",
  tags: ["RegressionRuns"],
  summary: "List regression run scenarios",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "runId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Scenarios", content: { "application/json": { schema: z.object({ scenarios: z.array(ScenarioSchema) }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/runs/{runId}/scenarios/{scenarioId}",
  tags: ["RegressionRuns"],
  summary: "Get regression scenario",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "runId", in: "path", required: true, schema: { type: "string" } },
    { name: "scenarioId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Scenario", content: { "application/json": { schema: ScenarioSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/runs/{runId}/scenarios/{scenarioId}/artifacts",
  tags: ["RegressionRuns"],
  summary: "List scenario artifacts",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "runId", in: "path", required: true, schema: { type: "string" } },
    { name: "scenarioId", in: "path", required: true, schema: { type: "string" } },
    { name: "kind", in: "query", required: false, schema: { type: "string" } },
    { name: "uploadStatus", in: "query", required: false, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Artifacts", content: { "application/json": { schema: z.object({ artifacts: z.array(ArtifactSchema) }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/runs/{runId}/scenarios/{scenarioId}/events",
  tags: ["RegressionRuns"],
  summary: "List scenario events",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "runId", in: "path", required: true, schema: { type: "string" } },
    { name: "scenarioId", in: "path", required: true, schema: { type: "string" } },
    { name: "type", in: "query", required: false, schema: { type: "string" } },
    { name: "limit", in: "query", required: false, schema: { type: "integer" } },
    { name: "cursor", in: "query", required: false, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Events", content: { "application/json": { schema: z.object({ events: z.array(EventSchema), nextCursor: z.string().optional() }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/runs/{runId}/artifacts",
  tags: ["RegressionRuns"],
  summary: "List run artifacts",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "runId", in: "path", required: true, schema: { type: "string" } },
    { name: "kind", in: "query", required: false, schema: { type: "string" } },
    { name: "scenarioId", in: "query", required: false, schema: { type: "string" } },
    { name: "uploadStatus", in: "query", required: false, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Artifacts", content: { "application/json": { schema: z.object({ artifacts: z.array(ArtifactSchema) }) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/runs/{runId}/artifacts/{artifactId}",
  tags: ["RegressionRuns"],
  summary: "Get regression artifact",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "runId", in: "path", required: true, schema: { type: "string" } },
    { name: "artifactId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Artifact", content: { "application/json": { schema: ArtifactSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/runs/{runId}/artifacts/{artifactId}/download",
  tags: ["RegressionRuns"],
  summary: "Download regression artifact",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "runId", in: "path", required: true, schema: { type: "string" } },
    { name: "artifactId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Artifact file" },
  },
});

void RegressionRunListQuerySchema;
void RegressionEventListQuerySchema;
void RegressionArtifactListQuerySchema;
