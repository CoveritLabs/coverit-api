// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import {
  type FlowEditorConnectResponse as ContractFlowEditorConnectResponse,
  type FlowEditorDetailResponse as ContractFlowEditorDetailResponse,
  type FlowEditorDraftStep as ContractFlowEditorDraftStep,
  type FlowEditorElementRef as ContractFlowEditorElementRef,
  type FlowEditorStepStateLabel as ContractFlowEditorStepStateLabel,
  type FlowEditorTestFlowSummary as ContractFlowEditorTestFlowSummary,
  type FlowEditorTransitionStep as ContractFlowEditorTransitionStep,
  type FlowStep as ContractFlowStep,
  type SaveAllFlowsRequest as ContractSaveAllFlowsRequest,
  type SaveFlowEditorStepsRequest as ContractSaveFlowEditorStepsRequest,
  type SaveFlowEditorStepsResponse as ContractSaveFlowEditorStepsResponse,
  type SerializedFlow as ContractSerializedFlow,
} from "@coveritlabs/contracts";
import { TestFlowType as PrismaTestFlowType } from "@generated/prisma/client";
import { CodegenConfigSchema, type CodegenConfig } from "@models/crawlSession";
import type { TestFlowStepLabelingStatus } from "@models/testFlowStepLabels";
import { z } from "@utils/zod";
import type { infer as ZodInfer, ZodType } from "zod";
import type { Plain } from "./common";

type ContractFlowStepData = Plain<ContractFlowStep>;
type ContractSerializedFlowData = Plain<ContractSerializedFlow>;
type ContractFlowEditorTestFlowData = Plain<ContractFlowEditorTestFlowSummary>;
type ContractFlowEditorElementRefData = Plain<ContractFlowEditorElementRef>;
type ContractFlowEditorDraftStepData = Plain<ContractFlowEditorDraftStep>;
type ContractFlowEditorStepStateLabelData = Plain<ContractFlowEditorStepStateLabel>;
type ContractFlowEditorTransitionStepData = Plain<ContractFlowEditorTransitionStep>;
type ContractFlowEditorDetailResponseData = Plain<ContractFlowEditorDetailResponse>;
type ContractSaveFlowEditorStepsRequestData = Plain<ContractSaveFlowEditorStepsRequest>;
type ContractSaveFlowEditorStepsResponseData = Plain<ContractSaveFlowEditorStepsResponse>;

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
export type FlowEditorStepKind = "design-class" | "design-operation" | "assertion" | "action-hook" | "group";
export type FlowEditorPositionEdge = "before" | "after";
export type FlowEditorValueType = "string" | "number" | "integer" | "currency" | "boolean" | "date" | "json" | "array" | "object";
export type FlowEditorCodeLanguage = "typescript";
export type FlowEditorValueSpec =
  | { literal: unknown }
  | { from: string }
  | { source: "extract"; id: string }
  | { source: "store" | "arg" | "context" | "env"; path: string }
  | { expressionId: string; args?: Record<string, FlowEditorValueSpec> }
  | { functionId: string; args?: Record<string, FlowEditorValueSpec> }
  | { code: FlowEditorInlineCodeBlock; args?: Record<string, FlowEditorValueSpec> }
  | { fields: Record<string, FlowEditorValueSpec> }
  | { list: FlowEditorValueSpec[] };

export interface FlowEditorInlineCodeBlock {
  language: FlowEditorCodeLanguage;
  body: string;
  imports?: string[];
  inputSchema?: unknown;
  outputSchema?: unknown;
}

export type ListTestFlowsQuery = ZodInfer<typeof ListTestFlowsQuerySchema>;
export type GenerateTestFlowBody = ZodInfer<typeof GenerateTestFlowBodySchema>;

export type TestFlowCrawlSessionSummary = Omit<NonNullable<ContractFlowEditorTestFlowData["crawlSession"]>, "finishedAt"> & {
  finishedAt?: string | null;
};

export type TestFlowResponse = Omit<ContractFlowEditorTestFlowData, "testFlowType" | "status" | "generatedAt" | "crawlSession"> & {
  testFlowType: TestFlowType;
  status: TestFlowStatus;
  generatedAt: string | null;
  crawlSession: TestFlowCrawlSessionSummary;
};

export interface ListTestFlowsResponse {
  flows: TestFlowResponse[];
  nextCursor?: string | null;
}

export type FlowEditorElementRef = Omit<ContractFlowEditorElementRefData, "selectorCandidates" | "tag" | "attributes" | "box" | "viewport"> & {
  selectorCandidates?: string[];
  tag?: string | null;
  attributes?: Record<string, string>;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  viewport?: {
    width: number;
    height: number;
  };
};

export type FlowEditorDraftStep = Omit<ContractFlowEditorDraftStepData, "kind" | "position" | "element" | "definition"> & {
  kind: FlowEditorStepKind;
  position: {
    edge: FlowEditorPositionEdge;
    transitionId: string;
  };
  element?: FlowEditorElementRef;
  definition: Record<string, unknown>;
};

export type FlowEditorStepStateLabel = Omit<ContractFlowEditorStepStateLabelData, "labelingStatus"> & {
  labelingStatus: TestFlowStepLabelingStatus;
};

export type FlowEditorTransitionStep = Omit<ContractFlowEditorTransitionStepData, "labelingStatus" | "fromState" | "toState"> & {
  labelingStatus: TestFlowStepLabelingStatus;
  fromState?: FlowEditorStepStateLabel;
  toState?: FlowEditorStepStateLabel;
};

export type FlowEditorDetailResponse = Omit<ContractFlowEditorDetailResponseData, "flow" | "transitionSteps" | "editorSteps"> & {
  flow: TestFlowResponse;
  transitionSteps: FlowEditorTransitionStep[];
  editorSteps: FlowEditorDraftStep[];
};

export type SaveFlowEditorStepsBody = Omit<ContractSaveFlowEditorStepsRequestData, "editorSteps"> & {
  editorSteps: FlowEditorDraftStep[];
};

export type SaveFlowEditorStepsResponse = Omit<ContractSaveFlowEditorStepsResponseData, "editorSteps"> & {
  editorSteps: FlowEditorDraftStep[];
};

export type FlowEditorConnectResponse = Plain<ContractFlowEditorConnectResponse>;

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

const FlowEditorElementBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const FlowEditorInlineCodeBlockSchema: ZodType<FlowEditorInlineCodeBlock> = z.object({
  language: z.literal("typescript"),
  body: z.string().min(1),
  imports: z.array(z.string()).optional(),
  inputSchema: z.unknown().optional(),
  outputSchema: z.unknown().optional(),
});

const FlowEditorValueSpecSchema: ZodType<FlowEditorValueSpec> = z.lazy(() =>
  z.union([
    z.object({ literal: z.unknown() }),
    z.object({ from: z.string().trim().min(1) }),
    z.object({ source: z.literal("extract"), id: z.string().trim().min(1) }),
    z.object({
      source: z.enum(["store", "arg", "context", "env"]),
      path: z.string().trim().min(1),
    }),
    z.object({
      expressionId: z.string().trim().min(1),
      args: z.record(z.string(), FlowEditorValueSpecSchema).optional(),
    }),
    z.object({
      functionId: z.string().trim().min(1),
      args: z.record(z.string(), FlowEditorValueSpecSchema).optional(),
    }),
    z.object({
      code: FlowEditorInlineCodeBlockSchema,
      args: z.record(z.string(), FlowEditorValueSpecSchema).optional(),
    }),
    z.object({ fields: z.record(z.string(), FlowEditorValueSpecSchema) }),
    z.object({ list: z.array(FlowEditorValueSpecSchema) }),
  ]),
);

export const FlowEditorElementRefSchema = z.object({
  selector: z.string().trim().max(2000).optional(),
  selectorCandidates: z.array(z.string().trim().max(2000)).optional(),
  tag: z.string().trim().max(80).nullable().optional(),
  text: z.string().max(500).optional(),
  accessibleName: z.string().max(500).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  pageUrl: z.string().max(2048).optional(),
  stateHash: z.string().max(200).optional(),
  box: FlowEditorElementBoxSchema.nullable().optional(),
  viewport: z.object({ width: z.number(), height: z.number() }).optional(),
}) satisfies ZodType<FlowEditorElementRef>;

export const FlowEditorDraftStepSchema = z.object({
  id: z.string().trim().min(1).max(100),
  kind: z.enum(["design-class", "design-operation", "assertion", "action-hook", "group"]),
  position: z.object({
    edge: z.enum(["before", "after"]),
    transitionId: z.string().trim().min(1).max(500),
  }),
  order: z.number().int().min(0).max(100_000),
  label: z.string().trim().min(1).max(500),
  element: FlowEditorElementRefSchema.optional(),
  definition: z
    .record(z.string(), z.unknown())
    .superRefine((definition, ctx) => {
      const maybeValue = definition.value ?? definition.expected ?? definition.expectedText ?? definition.expectedValue;
      if (maybeValue && typeof maybeValue === "object" && !Array.isArray(maybeValue)) {
        const result = FlowEditorValueSpecSchema.safeParse(maybeValue);
        if (!result.success && Object.keys(maybeValue).some((key) => ["literal", "from", "source", "expressionId", "functionId", "code", "fields", "list"].includes(key))) {
          ctx.addIssue({
            code: "custom",
            message: "definition contains an invalid ValueSpec",
          });
        }
      }
    }),
  createdAt: z.string().trim().min(1).max(80),
  updatedAt: z.string().trim().min(1).max(80),
}) satisfies ZodType<FlowEditorDraftStep>;

export const SaveFlowEditorStepsBodySchema = z.object({
  editorSteps: z.array(FlowEditorDraftStepSchema).max(500),
});
