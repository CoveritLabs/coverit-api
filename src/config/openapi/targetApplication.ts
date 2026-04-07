// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import { registry } from "./registry";
import {
  CreateTargetApplicationRequestSchema,
  UpdateTargetApplicationRequestSchema,
  CreateTargetApplicationVersionRequestSchema,
} from "@models/targetApplication";
import { CreateRegressionCodebaseRequestSchema, UpdateRegressionCodebaseRequestSchema } from "@models/regressionCodebase";

const MessageResponseSchema = z.object({ message: z.string() });
const ErrorResponseSchema = z.object({ message: z.string() });

const VersionSchema = z.object({ id: z.string(), version: z.string() });
const TargetApplicationResponseSchema = z.object({ id: z.string(), name: z.string(), baseUrl: z.string().optional(), versions: z.array(VersionSchema) });
const RegressionCodebaseResponseSchema = z.object({ id: z.string(), frameworkName: z.string(), repositoryUrl: z.string() });

registry.register("TargetApplicationResponse", TargetApplicationResponseSchema);
registry.register("RegressionCodebaseResponse", RegressionCodebaseResponseSchema);

// Create target application
registry.registerPath({
  method: "post",
  path: "/projects/{projectId}/target-applications",
  tags: ["TargetApplication"],
  summary: "Create a target application",
  security: [{ bearerAuth: [] }],
  parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }],
  request: { body: { content: { "application/json": { schema: CreateTargetApplicationRequestSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ id: z.string() }) } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// Update target application
registry.registerPath({
  method: "put",
  path: "/projects/{projectId}/target-applications/{appId}",
  tags: ["TargetApplication"],
  summary: "Update target application",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
  ],
  request: { body: { content: { "application/json": { schema: UpdateTargetApplicationRequestSchema } } } },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: MessageResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// Delete target application
registry.registerPath({
  method: "delete",
  path: "/projects/{projectId}/target-applications/{appId}",
  tags: ["TargetApplication"],
  summary: "Delete target application",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: MessageResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// List target applications
registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications",
  tags: ["TargetApplication"],
  summary: "List target applications",
  security: [{ bearerAuth: [] }],
  parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }],
  responses: {
    200: { description: "List", content: { "application/json": { schema: z.array(TargetApplicationResponseSchema) } } },
  },
});

// Get target application
registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}",
  tags: ["TargetApplication"],
  summary: "Get target application",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Target application", content: { "application/json": { schema: TargetApplicationResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// Create version
registry.registerPath({
  method: "post",
  path: "/projects/{projectId}/target-applications/{appId}/versions",
  tags: ["TargetApplication"],
  summary: "Create application version",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
  ],
  request: { body: { content: { "application/json": { schema: CreateTargetApplicationVersionRequestSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ id: z.string() }) } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// Delete version
registry.registerPath({
  method: "delete",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}",
  tags: ["TargetApplication"],
  summary: "Delete application version",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "versionId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: MessageResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// Regression codebases
registry.registerPath({
  method: "post",
  path: "/projects/{projectId}/target-applications/{appId}/regression-codebases",
  tags: ["RegressionCodebase"],
  summary: "Create regression codebase",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
  ],
  request: { body: { content: { "application/json": { schema: CreateRegressionCodebaseRequestSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ id: z.string() }) } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
    409: { description: "Conflict", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/projects/{projectId}/target-applications/{appId}/regression-codebases/{codebaseId}",
  tags: ["RegressionCodebase"],
  summary: "Update regression codebase",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "codebaseId", in: "path", required: true, schema: { type: "string" } },
  ],
  request: { body: { content: { "application/json": { schema: UpdateRegressionCodebaseRequestSchema } } } },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: MessageResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/projects/{projectId}/target-applications/{appId}/regression-codebases/{codebaseId}",
  tags: ["RegressionCodebase"],
  summary: "Delete regression codebase",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "codebaseId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: MessageResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/regression-codebases",
  tags: ["RegressionCodebase"],
  summary: "List regression codebases",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "List", content: { "application/json": { schema: z.array(RegressionCodebaseResponseSchema) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/regression-codebases/{codebaseId}",
  tags: ["RegressionCodebase"],
  summary: "Get regression codebase",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "appId", in: "path", required: true, schema: { type: "string" } },
    { name: "codebaseId", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Regression codebase", content: { "application/json": { schema: RegressionCodebaseResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});
