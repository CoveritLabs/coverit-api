// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import { registry } from "./registry";
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  AddMembersRequestSchema,
  RemoveMembersRequestSchema,
  UpdateMemberRequestSchema,
} from "@models/project";

const MessageResponseSchema = z.object({ message: z.string() });
const ErrorResponseSchema = z.object({ message: z.string() });

const UserInfoSchema = z.object({ id: z.string(), email: z.string(), name: z.string() });
const MemberSchema = z.object({ user: UserInfoSchema.optional(), role: z.string() });
const ProjectResponseSchema = z.object({ id: z.string(), name: z.string(), description: z.string().optional(), members: z.array(MemberSchema) });

registry.register("ProjectResponse", ProjectResponseSchema);

registry.registerPath({
  method: "post",
  path: "/projects",
  tags: ["Project"],
  summary: "Create a new project",
  description: "Create a project and add the caller as admin.",
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: CreateProjectRequestSchema } } } },
  responses: {
    201: { description: "Project created", content: { "application/json": { schema: z.object({ id: z.string() }) } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/projects/{projectId}",
  tags: ["Project"],
  summary: "Update project",
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: UpdateProjectRequestSchema } } } },
  parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }],
  responses: {
    200: { description: "Project updated", content: { "application/json": { schema: MessageResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/projects/{projectId}",
  tags: ["Project"],
  summary: "Delete project",
  security: [{ bearerAuth: [] }],
  parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }],
  responses: {
    200: { description: "Project deleted", content: { "application/json": { schema: MessageResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects",
  tags: ["Project"],
  summary: "List projects",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of projects", content: { "application/json": { schema: z.array(ProjectResponseSchema) } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/projects/{projectId}",
  tags: ["Project"],
  summary: "Get project",
  security: [{ bearerAuth: [] }],
  parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }],
  responses: {
    200: { description: "Project details", content: { "application/json": { schema: ProjectResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/projects/{projectId}/members",
  tags: ["Project"],
  summary: "Add project members",
  security: [{ bearerAuth: [] }],
  parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }],
  request: { body: { content: { "application/json": { schema: AddMembersRequestSchema } } } },
  responses: {
    200: { description: "Members added", content: { "application/json": { schema: MessageResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/projects/{projectId}/members",
  tags: ["Project"],
  summary: "Update project member role",
  security: [{ bearerAuth: [] }],
  parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }],
  request: { body: { content: { "application/json": { schema: UpdateMemberRequestSchema } } } },
  responses: {
    200: { description: "Member updated", content: { "application/json": { schema: MessageResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/projects/{projectId}/members",
  tags: ["Project"],
  summary: "Remove project members",
  security: [{ bearerAuth: [] }],
  parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }],
  request: { body: { content: { "application/json": { schema: RemoveMembersRequestSchema } } } },
  responses: {
    200: { description: "Members removed", content: { "application/json": { schema: MessageResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});
