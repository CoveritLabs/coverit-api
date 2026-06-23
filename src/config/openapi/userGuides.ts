// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import { GenerateUserGuidesBodySchema, UserGuideStateSchema, UserGuideStatesResponseSchema } from "@models/userGuides";
import { registry } from "./registry";

const ErrorResponseSchema = z.object({ message: z.string() });
const GenerateUserGuidesResponseSchema = z.object({
  message: z.string(),
  userGuide: z.string(),
  error: z.string().optional(),
});

registry.register("UserGuideState", UserGuideStateSchema);
registry.register("UserGuideStatesResponse", UserGuideStatesResponseSchema);
registry.register("GenerateUserGuidesBody", GenerateUserGuidesBodySchema);
registry.register("GenerateUserGuidesResponse", GenerateUserGuidesResponseSchema);

const sessionParams = [
  { name: "projectId", in: "path", required: true, schema: { type: "string" } },
  { name: "appId", in: "path", required: true, schema: { type: "string" } },
  { name: "versionId", in: "path", required: true, schema: { type: "string" } },
  { name: "crawlSessionId", in: "path", required: true, schema: { type: "string" } },
] as const;

type JsonSchema =
  | typeof UserGuideStatesResponseSchema
  | typeof GenerateUserGuidesBodySchema
  | typeof GenerateUserGuidesResponseSchema
  | typeof ErrorResponseSchema;
type JsonContent = { "application/json": { schema: JsonSchema } };

const json = (schema: JsonSchema): JsonContent => ({
  "application/json": { schema },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}/crawl-sessions/{crawlSessionId}/states",
  tags: ["UserGuides"],
  summary: "List states available for user guide generation",
  security: [{ bearerAuth: [] }],
  parameters: [...sessionParams],
  responses: {
    200: { description: "States discovered in the crawl session", content: json(UserGuideStatesResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/projects/{projectId}/target-applications/{appId}/versions/{versionId}/crawl-sessions/{crawlSessionId}/generate",
  tags: ["UserGuides"],
  summary: "Generate a user guide between two states",
  security: [{ bearerAuth: [] }],
  parameters: [...sessionParams],
  request: {
    body: {
      content: json(GenerateUserGuidesBodySchema),
    },
  },
  responses: {
    200: { description: "Generated user guide", content: json(GenerateUserGuidesResponseSchema) },
    400: { description: "Validation failed", content: json(ErrorResponseSchema) },
    403: { description: "Forbidden", content: json(ErrorResponseSchema) },
    404: { description: "Not found", content: json(ErrorResponseSchema) },
  },
});
