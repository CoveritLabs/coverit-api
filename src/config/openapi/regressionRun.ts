// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import { registry } from "./registry";
import {
  RegressionCompleteBodySchema,
  RegressionArtifactResponseSchema,
  RegressionArtifactUploadResponseSchema,
  RegressionEventsIngestBodySchema,
  RegressionRunResponseSchema,
  RegressionScenarioResponseSchema,
  ListRegressionEventsResponseSchema,
  ListRegressionRunsResponseSchema,
  ListRegressionScenariosResponseSchema,
} from "@models/regressionRun";
import {
  CreateScenarioIntegrationReportBodySchema,
  CreateScenarioIntegrationReportResponseSchema,
  InternalClaimScenarioReportBodySchema,
  InternalPatchScenarioReportBodySchema,
  InternalScenarioReportContextResponseSchema,
} from "@models/scenarioReports";

const ErrorResponseSchema = z.object({ message: z.string() });
const MessageResponseSchema = z.object({ message: z.string() });
const ArtifactTreeChildNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.enum(["folder", "file"]),
  artifact: RegressionArtifactResponseSchema.optional(),
  artifactCount: z.number(),
  sizeBytes: z.number().optional(),
});
const ArtifactTreeNodeSchema = ArtifactTreeChildNodeSchema.extend({
  children: z.array(ArtifactTreeChildNodeSchema).optional(),
});
const ArtifactListResponseSchema = z.object({
  artifacts: z.array(RegressionArtifactResponseSchema),
  artifactTree: z.array(ArtifactTreeNodeSchema),
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
            runName: z.string().optional(),
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
    202: { description: "Accepted", content: { "application/json": { schema: RegressionArtifactUploadResponseSchema } } },
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
    200: {
      description: "Runs",
      content: { "application/json": { schema: ListRegressionRunsResponseSchema } },
    },
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
    200: { description: "Run", content: { "application/json": { schema: RegressionRunResponseSchema } } },
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
    200: { description: "Scenarios", content: { "application/json": { schema: ListRegressionScenariosResponseSchema } } },
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
    200: { description: "Scenario", content: { "application/json": { schema: RegressionScenarioResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/projects/{projectId}/target-applications/{appId}/runs/{runId}/scenarios/{scenarioId}/reports/{provider}",
  tags: ["RegressionRuns"],
  summary: "Create scenario integration report",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "runId", in: "path", required: true, schema: { type: "string" } },
    { name: "scenarioId", in: "path", required: true, schema: { type: "string" } },
    { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["jira"] } },
  ],
  request: { body: { content: { "application/json": { schema: CreateScenarioIntegrationReportBodySchema } } } },
  responses: {
    202: { description: "Scenario report queued", content: { "application/json": { schema: CreateScenarioIntegrationReportResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
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
    200: { description: "Artifacts", content: { "application/json": { schema: ArtifactListResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/internal/reports/scenario/claim",
  tags: ["InternalScenarioReports"],
  summary: "Claim a pending scenario integration report",
  parameters: [{ name: "x-coverit-internal-token", in: "header", required: true, schema: { type: "string" } }],
  request: { body: { content: { "application/json": { schema: InternalClaimScenarioReportBodySchema } } } },
  responses: {
    200: { description: "Scenario report claimed", content: { "application/json": { schema: CreateScenarioIntegrationReportResponseSchema } } },
    204: { description: "No claimable scenario report" },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/internal/reports/scenario/{reportId}/context",
  tags: ["InternalScenarioReports"],
  summary: "Get scenario integration report context",
  parameters: [
    { name: "x-coverit-internal-token", in: "header", required: true, schema: { type: "string" } },
    { name: "reportId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Scenario report context", content: { "application/json": { schema: InternalScenarioReportContextResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/internal/reports/scenario/{reportId}",
  tags: ["InternalScenarioReports"],
  summary: "Patch scenario integration report",
  parameters: [
    { name: "x-coverit-internal-token", in: "header", required: true, schema: { type: "string" } },
    { name: "reportId", in: "path", required: true, schema: { type: "string" } },
  ],
  request: { body: { content: { "application/json": { schema: InternalPatchScenarioReportBodySchema } } } },
  responses: {
    200: { description: "Scenario report updated", content: { "application/json": { schema: CreateScenarioIntegrationReportResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
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
    200: {
      description: "Events",
      content: { "application/json": { schema: ListRegressionEventsResponseSchema } },
    },
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
    200: { description: "Artifacts", content: { "application/json": { schema: ArtifactListResponseSchema } } },
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
    200: { description: "Artifact", content: { "application/json": { schema: RegressionArtifactResponseSchema } } },
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
