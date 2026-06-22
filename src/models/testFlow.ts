// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import {
  type FlowStep as ContractFlowStep,
  type SaveAllFlowsRequest as ContractSaveAllFlowsRequest,
  type SerializedFlow as ContractSerializedFlow,
} from "@coveritlabs/contracts";
import { TestFlowType as PrismaTestFlowType } from "@generated/prisma/client";
import { CodegenConfigSchema, type CodegenConfig } from "@models/crawlSession";
import { z } from "@utils/zod";
import type { infer as ZodInfer, ZodType } from "zod";
import type { Plain } from "./common";

type ContractFlowStepData = Plain<ContractFlowStep>;
type ContractSerializedFlowData = Plain<ContractSerializedFlow>;

export type FlowStep = Omit<ContractFlowStepData, "stateHash" | "transition"> & {
  state_hash: ContractFlowStepData["stateHash"];
  transition: Record<string, unknown> | null;
};

export type SerializedFlow = Omit<ContractSerializedFlowData, "checkpointUrl" | "isClipped" | "path"> & {
  checkpoint_url?: ContractSerializedFlowData["checkpointUrl"];
  is_clipped: ContractSerializedFlowData["isClipped"];
  path: FlowStep[];
};

export type AllFlowsPayload = Record<string, SerializedFlow[]>;

export type SaveAllFlowsBody = Omit<Plain<ContractSaveAllFlowsRequest>, "flows"> & {
  flows: AllFlowsPayload;
};

export const FlowStepSchema = z.object({
  state_hash: z.string(),
  transition: z.record(z.string(), z.unknown()).nullable(),
}) satisfies ZodType<FlowStep>;

export const SerializedFlowSchema = z.object({
  checkpoint: z.string(),
  checkpoint_url: z.string().optional(),
  is_clipped: z.boolean(),
  path: z.array(FlowStepSchema),
}) satisfies ZodType<SerializedFlow>;

export const SaveAllFlowsBodySchema = z.object({
  flows: z.record(z.string(), z.array(SerializedFlowSchema)),
}) satisfies ZodType<SaveAllFlowsBody>;

export type TestFlowType = PrismaTestFlowType;
export type TestFlowStatus = "NEEDS_GENERATION" | "STALE" | "GENERATED";

export type ListTestFlowsQuery = ZodInfer<typeof ListTestFlowsQuerySchema>;
export type GenerateTestFlowBody = ZodInfer<typeof GenerateTestFlowBodySchema>;

export interface TestFlowCrawlSessionSummary {
  id: string;
  triggerType: string;
  status: string;
  createdAt: string;
  finishedAt?: string | null;
}

export interface TestFlowResponse {
  id: string;
  crawlSessionId: string;
  appVersionId: string;
  appVersionName: string;
  checkpointStateHash: string;
  transitionRefs: string[];
  testFlowType: TestFlowType;
  stepCount: number;
  status: TestFlowStatus;
  createdAt: string;
  generatedAt: string | null;
  modifiedAt: string;
  crawlSession: TestFlowCrawlSessionSummary;
}

export interface ListTestFlowsResponse {
  flows: TestFlowResponse[];
  nextCursor?: string | null;
}

export interface GenerateTestFlowResponse {
  message: string;
  flowId: string;
  jobId: string;
}

const TestFlowTypeQuerySchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.enum(PrismaTestFlowType).optional(),
);

export const ListTestFlowsQuerySchema = z.object({
  versionId: z.uuid().optional(),
  sessionId: z.uuid().optional(),
  type: TestFlowTypeQuerySchema,
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const GenerateTestFlowBodySchema = z.object({
  regressionCodebaseId: z.uuid(),
  codegenConfig: CodegenConfigSchema,
}) satisfies ZodType<{ regressionCodebaseId: string; codegenConfig: CodegenConfig }>;
