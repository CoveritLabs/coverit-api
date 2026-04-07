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
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { ZodType } from "zod";
import type { Plain } from "./common";

export type CreateProjectRequest = Plain<ContractCreateProjectRequest>;
export type UpdateProjectRequest = Plain<ContractUpdateProjectRequest>;
export type AddMembersRequest = Plain<ContractAddMembersRequest>;
export type RemoveMembersRequest = Plain<ContractRemoveMembersRequest>;

export const CreateProjectRequestSchema = z.object({
  name: z.requiredString(PROJECT_VALIDATION.NAME_REQUIRED).min(1, PROJECT_VALIDATION.NAME_MIN_LENGTH),
}) satisfies ZodType<CreateProjectRequest>;

export const UpdateProjectRequestSchema = z.object({
  name: z.optional(z.string().min(1, PROJECT_VALIDATION.NAME_MIN_LENGTH)),
}) satisfies ZodType<UpdateProjectRequest>;

export const AddMembersRequestSchema = z.object({
  emails: z.array(z.string().email(PROJECT_VALIDATION.MEMBERS_INVALID_USER)).min(1, "At least one email is required"),
}) satisfies ZodType<AddMembersRequest>;

export const RemoveMembersRequestSchema = z.object({
  emails: z.array(z.string().email(PROJECT_VALIDATION.MEMBERS_INVALID_USER)).min(1, "At least one email is required"),
}) satisfies ZodType<RemoveMembersRequest>;
