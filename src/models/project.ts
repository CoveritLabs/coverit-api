// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Project domain DTOs

import { PROJECT_VALIDATION } from "@constants/messages";
import type {
  CreateProjectRequest as ContractCreateProjectRequest,
  UpdateProjectRequest as ContractUpdateProjectRequest,
  AddMembersRequest as ContractAddMembersRequest,
  RemoveMembersRequest as ContractRemoveMembersRequest,
  CreateProjectResponse as ContractCreateProjectResponse,
  ProjectResponse as ContractProjectResponse,
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { ZodType } from "zod";
import type { Plain } from "./common";

export type CreateProjectRequest = Plain<ContractCreateProjectRequest>;
export type UpdateProjectRequest = Plain<ContractUpdateProjectRequest>;
export type AddMembersRequest = Plain<ContractAddMembersRequest>;
export type RemoveMembersRequest = Plain<ContractRemoveMembersRequest>;
export type CreateProjectResponse = Plain<ContractCreateProjectResponse>;
export type ProjectResponse = Plain<ContractProjectResponse>;

export const CreateProjectRequestSchema = z.object({
  name: z.requiredString(PROJECT_VALIDATION.NAME_REQUIRED).min(1, PROJECT_VALIDATION.NAME_MIN_LENGTH),
  description: z.optional(z.string().max(200, PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH)),
}) satisfies ZodType<CreateProjectRequest>;

export const UpdateProjectRequestSchema = z.object({
  name: z.optional(z.string().min(1, PROJECT_VALIDATION.NAME_MIN_LENGTH)),
  description: z.optional(z.string().max(200, PROJECT_VALIDATION.DESCRIPTION_MAX_LENGTH)),
}) satisfies ZodType<UpdateProjectRequest>;

export const AddMembersRequestSchema = z.object({
  emails: z.array(z.string().email(PROJECT_VALIDATION.MEMBERS_INVALID_USER)).min(1, PROJECT_VALIDATION.MEMBERS_MIN_ITEMS),
}) satisfies ZodType<AddMembersRequest>;

export const RemoveMembersRequestSchema = z.object({
  emails: z.array(z.string().email(PROJECT_VALIDATION.MEMBERS_INVALID_USER)).min(1, PROJECT_VALIDATION.MEMBERS_MIN_ITEMS),
}) satisfies ZodType<RemoveMembersRequest>;

export { ProjectRole } from "@generated/prisma/client";
