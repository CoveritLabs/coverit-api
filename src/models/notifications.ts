// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { CodegenNotificationStatus, type InternalCodegenNotificationRequest as ContractInternalCodegenNotificationRequest } from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { infer as ZodInfer } from "zod";
import type { Plain } from "./common";

type InternalCodegenNotificationContract = Plain<ContractInternalCodegenNotificationRequest>;

export const CODEGEN_NOTIFICATION_STATUS_BY_BODY_STATUS = {
  generated: CodegenNotificationStatus.GENERATED,
  failed: CodegenNotificationStatus.FAILED,
} as const;

export const InternalCodegenNotificationBodySchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("generated"),
    branchName: z.string().default(""),
    changedFiles: z.array(z.string()).default([]),
    noChanges: z.boolean(),
    pushed: z.boolean(),
    pullRequestUrl: z.string().nullable().optional(),
    flowIds: z.array(z.uuid()).default([]),
  }),
  z.object({
    status: z.literal("failed"),
    errorMessage: z.string().min(1),
  }),
]);

export type InternalCodegenNotificationBody = ZodInfer<typeof InternalCodegenNotificationBodySchema>;
export type InternalGeneratedCodegenNotificationBody = Extract<InternalCodegenNotificationBody, { status: "generated" }> &
  Pick<InternalCodegenNotificationContract, "branchName" | "changedFiles" | "noChanges" | "pushed" | "pullRequestUrl">;
export type InternalFailedCodegenNotificationBody = Extract<InternalCodegenNotificationBody, { status: "failed" }> &
  Required<Pick<InternalCodegenNotificationContract, "errorMessage">>;
