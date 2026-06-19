// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import { registry } from "./registry";

const ErrorResponseSchema = z.object({ message: z.string() });
const MessageResponseSchema = z.object({ message: z.string() });
const StartIntegrationOAuthResponseSchema = z.object({ authorizationUrl: z.string().url() });
const IntegrationStatusResponseSchema = z.object({
  connected: z.boolean(),
  provider: z.literal("jira"),
  scopes: z.array(z.string()),
  authorizedByUserId: z.string().optional(),
  accessTokenExpiresAt: z.string().optional(),
  refreshedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  details: z.object({
    case: z.enum(["jira"]).optional(),
    value: z
      .object({
        cloudId: z.string(),
        siteName: z.string().optional(),
        siteUrl: z.string().optional(),
      })
      .optional(),
  }),
});

registry.register("IntegrationStatusResponse", IntegrationStatusResponseSchema);

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
