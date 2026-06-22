// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import { registry } from "./registry";
import {
  IntegrationReportingConfigResponseSchema,
  IntegrationReportingOptionsResponseSchema,
  IntegrationStatusResponseSchema,
  StartIntegrationOAuthResponseSchema,
  UpdateIntegrationReportingConfigBodySchema,
} from "@models/integrations";

const ErrorResponseSchema = z.object({ message: z.string() });
const MessageResponseSchema = z.object({ message: z.string() });

registry.register("IntegrationStatusResponse", IntegrationStatusResponseSchema);
registry.register("IntegrationReportingConfigResponse", IntegrationReportingConfigResponseSchema);
registry.register("IntegrationReportingOptionsResponse", IntegrationReportingOptionsResponseSchema);

registry.registerPath({
  method: "post",
  path: "/projects/{projectId}/integrations/{provider}/oauth",
  tags: ["Integrations"],
  summary: "Start integration OAuth",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["jira"] } },
  ],
  responses: {
    200: { description: "Integration authorization URL", content: { "application/json": { schema: StartIntegrationOAuthResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/integrations/{provider}/reporting/options",
  tags: ["Integrations"],
  summary: "Get integration reporting options",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["jira"] } },
  ],
  responses: {
    200: { description: "Integration reporting options", content: { "application/json": { schema: IntegrationReportingOptionsResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/projects/{projectId}/integrations/{provider}/reporting/config",
  tags: ["Integrations"],
  summary: "Update integration reporting config",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["jira"] } },
  ],
  request: { body: { content: { "application/json": { schema: UpdateIntegrationReportingConfigBodySchema } } } },
  responses: {
    200: { description: "Integration reporting config", content: { "application/json": { schema: IntegrationReportingConfigResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/integrations/{provider}",
  tags: ["Integrations"],
  summary: "Get integration status",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["jira"] } },
  ],
  responses: {
    200: { description: "Integration status", content: { "application/json": { schema: IntegrationStatusResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/projects/{projectId}/integrations/{provider}",
  tags: ["Integrations"],
  summary: "Disconnect integration",
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "projectId", in: "path", required: true, schema: { type: "string" } },
    { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["jira"] } },
  ],
  responses: {
    200: { description: "Jira integration disconnected", content: { "application/json": { schema: MessageResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/oauth/{provider}/callback",
  tags: ["Integrations"],
  summary: "Integration OAuth callback",
  parameters: [{ name: "provider", in: "path", required: true, schema: { type: "string", enum: ["jira"] } }],
  responses: {
    302: { description: "Redirects to the frontend with Jira connection status" },
  },
});
