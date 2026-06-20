// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import {
  type FlowStep as ContractFlowStep,
  type SaveAllFlowsRequest as ContractSaveAllFlowsRequest,
  type SerializedFlow as ContractSerializedFlow,
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { ZodType } from "zod";
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
