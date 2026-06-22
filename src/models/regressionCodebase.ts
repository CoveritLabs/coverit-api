// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// RegressionCodebase domain DTOs

import { REGRESSION_CODEBASE_VALIDATION } from "@constants/messages";
import type {
  CreateRegressionCodebaseRequest as ContractCreateRegressionCodebaseRequest,
  UpdateRegressionCodebaseRequest as ContractUpdateRegressionCodebaseRequest,
  RegressionCodebaseResponse as ContractRegressionCodebaseResponse,
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { ZodType } from "zod";
import type { Plain } from "./common";

export type CreateRegressionCodebaseRequest = Plain<ContractCreateRegressionCodebaseRequest>;
export type UpdateRegressionCodebaseRequest = Plain<ContractUpdateRegressionCodebaseRequest>;
export type RegressionCodebaseResponse = Plain<ContractRegressionCodebaseResponse>;

export const CreateRegressionCodebaseRequestSchema = z.object({
  frameworkName: z
    .requiredString(REGRESSION_CODEBASE_VALIDATION.FRAMEWORK_NAME_REQUIRED)
    .min(1, REGRESSION_CODEBASE_VALIDATION.FRAMEWORK_NAME_MIN_LENGTH),
  repositoryUrl: z.requiredString(REGRESSION_CODEBASE_VALIDATION.REPOSITORY_URL_REQUIRED).url(REGRESSION_CODEBASE_VALIDATION.REPOSITORY_URL_INVALID),
  apiKey: z.optional(z.string().min(1, REGRESSION_CODEBASE_VALIDATION.API_KEY_INVALID)),
}) satisfies ZodType<CreateRegressionCodebaseRequest>;

export const UpdateRegressionCodebaseRequestSchema = z.object({
  frameworkName: z.optional(z.string().min(1, REGRESSION_CODEBASE_VALIDATION.FRAMEWORK_NAME_MIN_LENGTH)),
  repositoryUrl: z.optional(z.string().url(REGRESSION_CODEBASE_VALIDATION.REPOSITORY_URL_INVALID)),
  apiKey: z.optional(z.string()),
}) satisfies ZodType<UpdateRegressionCodebaseRequest>;
