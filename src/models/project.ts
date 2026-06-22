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
  UpdateMemberRequest as ContractUpdateMemberRequest,
  CreateProjectResponse as ContractCreateProjectResponse,
  ProjectResponse as ContractProjectResponse,
} from "@coveritlabs/contracts";
import { ProjectRole } from "@generated/prisma/client";
import { z } from "@utils/zod";
import type { ZodType } from "zod";
import type { Plain } from "./common";

export type CreateProjectRequest = Plain<ContractCreateProjectRequest>;
export type UpdateProjectRequest = Plain<ContractUpdateProjectRequest>;
export type AddMembersRequest = Plain<ContractAddMembersRequest>;
export type RemoveMembersRequest = Plain<ContractRemoveMembersRequest>;
export type UpdateMemberRequest = Plain<ContractUpdateMemberRequest>;
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

export const MemberRequestSchema = z.object({
  email: z.string().email(PROJECT_VALIDATION.MEMBERS_INVALID_USER),
  role: z.nativeEnum(ProjectRole),
});

export const AddMembersRequestSchema = z.object({
  members: z.array(MemberRequestSchema).min(1, PROJECT_VALIDATION.MEMBERS_MIN_ITEMS),
});

export const RemoveMembersRequestSchema = z.object({
  emails: z.array(z.string().email(PROJECT_VALIDATION.MEMBERS_INVALID_USER)).min(1, PROJECT_VALIDATION.MEMBERS_MIN_ITEMS),
}) satisfies ZodType<RemoveMembersRequest>;

export const UpdateMemberRequestSchema = z.object({
  id: z.requiredString(PROJECT_VALIDATION.MEMBER_ID_REQUIRED),
  role: z.nativeEnum(ProjectRole),
}) satisfies ZodType<UpdateMemberRequest>;

export { ProjectRole };
