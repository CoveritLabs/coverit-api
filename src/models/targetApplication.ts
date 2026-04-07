// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// TargetApplication domain DTOs

import { TARGET_APPLICATION_VALIDATION } from "@constants/messages";
import type {
  CreateTargetApplicationRequest as ContractCreateTargetApplicationRequest,
  UpdateTargetApplicationRequest as ContractUpdateTargetApplicationRequest,
  CreateTargetApplicationResponse as ContractCreateTargetApplicationResponse,
  TargetApplicationResponse as ContractTargetApplicationResponse,
  CreateTargetApplicationVersionRequest as ContractCreateTargetApplicationVersionRequest,
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { ZodType } from "zod";
import type { Plain } from "./common";

export type CreateTargetApplicationRequest = Plain<ContractCreateTargetApplicationRequest>;
export type UpdateTargetApplicationRequest = Plain<ContractUpdateTargetApplicationRequest>;
export type CreateTargetApplicationResponse = Plain<ContractCreateTargetApplicationResponse>;
export type TargetApplicationResponse = Plain<ContractTargetApplicationResponse>;
export type CreateTargetApplicationVersionRequest = Plain<ContractCreateTargetApplicationVersionRequest>;

export const CreateTargetApplicationRequestSchema = z.object({
  name: z.requiredString(TARGET_APPLICATION_VALIDATION.NAME_REQUIRED).min(1, TARGET_APPLICATION_VALIDATION.NAME_MIN_LENGTH),
  baseUrl: z.requiredString(TARGET_APPLICATION_VALIDATION.BASE_URL_REQUIRED).url(TARGET_APPLICATION_VALIDATION.BASE_URL_INVALID),
}) satisfies ZodType<CreateTargetApplicationRequest>;

export const UpdateTargetApplicationRequestSchema = z.object({
  name: z.optional(z.string().min(1, TARGET_APPLICATION_VALIDATION.NAME_MIN_LENGTH)),
  baseUrl: z.optional(z.string().url(TARGET_APPLICATION_VALIDATION.BASE_URL_INVALID)),
}) satisfies ZodType<UpdateTargetApplicationRequest>;

export const CreateTargetApplicationVersionRequestSchema = z.object({
  version: z.requiredString(TARGET_APPLICATION_VALIDATION.VERSION_REQUIRED),
}) satisfies ZodType<CreateTargetApplicationVersionRequest>;
