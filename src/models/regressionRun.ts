// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { REGRESSION_RUN_VALIDATION } from "@constants/messages";
import type {
  ListRegressionArtifactsResponse as ContractListRegressionArtifactsResponse,
  ListRegressionEventsResponse as ContractListRegressionEventsResponse,
  ListRegressionRunsRequest as ContractListRegressionRunsRequest,
  ListRegressionRunsResponse as ContractListRegressionRunsResponse,
  ListRegressionScenariosResponse as ContractListRegressionScenariosResponse,
  RegressionArtifact as ContractRegressionArtifact,
  RegressionArtifactTreeNode as ContractRegressionArtifactTreeNode,
  RegressionEvent as ContractRegressionEvent,
  RegressionRun as ContractRegressionRun,
  RegressionRunSummary as ContractRegressionRunSummary,
  RegressionScenario as ContractRegressionScenario,
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { infer as ZodInfer, ZodType } from "zod";
import type { Plain } from "./common";

export const RegressionRunStatusSchema = z.enum(["running", "passed", "failed"]);
export const RegressionScenarioStatusSchema = z.enum(["running", "passed", "failed"]);
export const RegressionArtifactKindSchema = z.enum(["failure", "log", "healing", "summary", "screenshot", "video", "trace", "events", "other"]);
export const RegressionArtifactUploadStatusSchema = z.enum(["uploaded", "failed"]);

export const RegressionEventSchema = z
  .object({
    id: z.requiredString(REGRESSION_RUN_VALIDATION.EVENT_ID_REQUIRED),
    type: z.requiredString(REGRESSION_RUN_VALIDATION.EVENT_TYPE_REQUIRED),
    timestamp: z.string().datetime({ message: REGRESSION_RUN_VALIDATION.TIMESTAMP_INVALID }),
    runId: z.requiredString(REGRESSION_RUN_VALIDATION.RUN_ID_REQUIRED),
    runName: z.string().optional(),
    applicationId: z.string().optional(),
    versionId: z.string().optional(),
    featureName: z.string().optional(),
    scenarioName: z.string().optional(),
    payload: z.unknown(),
  })
  .passthrough();

export const RegressionEventsIngestBodySchema = z.union([RegressionEventSchema, z.object({ events: z.array(RegressionEventSchema).min(1) })]);

export const RegressionRunSummarySchema = z
  .object({
    status: RegressionRunStatusSchema,
    startedAt: z.string().datetime().optional(),
    finishedAt: z.string().datetime().optional(),
    durationMs: z.number().int().nonnegative().optional(),
    totals: z.object({
      passed: z.number().int().nonnegative().default(0),
      failed: z.number().int().nonnegative().default(0),
      warnings: z.number().int().nonnegative().default(0),
    }),
    reports: z
      .array(
        z.object({
          stepType: z.string(),
          id: z.string(),
          label: z.string(),
          results: z.array(z.record(z.string(), z.unknown())),
          allPassed: z.boolean(),
        }),
      )
      .default([]),
  })
  .passthrough();

export const RegressionCompleteBodySchema = z
  .object({
    applicationId: z.string().optional(),
    versionId: z.string().optional(),
    runName: z.string().optional(),
    summary: RegressionRunSummarySchema.optional(),
  })
  .passthrough();

export const RegressionRunListQuerySchema = z.object({
  versionId: z.string().optional(),
  status: RegressionRunStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const RegressionEventListQuerySchema = z.object({
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  cursor: z.string().optional(),
});

export const RegressionArtifactListQuerySchema = z.object({
  kind: RegressionArtifactKindSchema.optional(),
  scenarioId: z.string().optional(),
  uploadStatus: RegressionArtifactUploadStatusSchema.optional(),
});

export const RegressionArtifactUploadFieldsSchema = z.object({
  applicationId: z.requiredString(REGRESSION_RUN_VALIDATION.APPLICATION_ID_REQUIRED),
  versionId: z.string().optional(),
  runName: z.string().optional(),
  scenarioKey: z.string().optional(),
  featureName: z.string().optional(),
  scenarioName: z.string().optional(),
  kind: RegressionArtifactKindSchema,
  name: z.requiredString(REGRESSION_RUN_VALIDATION.ARTIFACT_NAME_REQUIRED),
  relativePath: z.requiredString(REGRESSION_RUN_VALIDATION.ARTIFACT_PATH_REQUIRED),
  contentType: z.string().optional(),
  metadata: z.string().optional(),
});

export type RegressionEventInput = ZodInfer<typeof RegressionEventSchema>;
export type RegressionRunStatus = ZodInfer<typeof RegressionRunStatusSchema>;
export type RegressionScenarioStatus = ZodInfer<typeof RegressionScenarioStatusSchema>;
export type RegressionArtifactKind = ZodInfer<typeof RegressionArtifactKindSchema>;
export type RegressionArtifactUploadStatus = ZodInfer<typeof RegressionArtifactUploadStatusSchema>;
export type RegressionRunListQuery = ZodInfer<typeof RegressionRunListQuerySchema>;
export type RegressionEventListQuery = ZodInfer<typeof RegressionEventListQuerySchema>;
export type RegressionArtifactListQuery = ZodInfer<typeof RegressionArtifactListQuerySchema>;
export type RegressionArtifactUploadFields = ZodInfer<typeof RegressionArtifactUploadFieldsSchema>;

export type RegressionRunContract = Plain<ContractRegressionRun>;
export type RegressionScenarioContract = Plain<ContractRegressionScenario>;
export type RegressionEventContract = Plain<ContractRegressionEvent>;
export type RegressionArtifactContract = Plain<ContractRegressionArtifact>;
export type RegressionArtifactTreeNodeContract = Plain<ContractRegressionArtifactTreeNode>;
export type RegressionRunSummaryContract = Plain<ContractRegressionRunSummary>;
export type ListRegressionRunsRequest = Plain<ContractListRegressionRunsRequest>;
export type ListRegressionRunsContractResponse = Plain<ContractListRegressionRunsResponse>;
export type ListRegressionScenariosContractResponse = Plain<ContractListRegressionScenariosResponse>;
export type ListRegressionEventsContractResponse = Plain<ContractListRegressionEventsResponse>;
export type ListRegressionArtifactsContractResponse = Plain<ContractListRegressionArtifactsResponse>;

export type RegressionRunResponse = Omit<RegressionRunContract, "status"> & {
  status: RegressionRunStatus;
  summary?: unknown;
  name: string;
  nameNumber: number;
  displayName: string;
};

export type RegressionScenarioResponse = Omit<RegressionScenarioContract, "status"> & {
  status: RegressionScenarioStatus;
};

export type RegressionEventResponse = Omit<RegressionEventContract, "payload"> & {
  payload: unknown;
};

export type RegressionArtifactResponse = Omit<RegressionArtifactContract, "kind" | "data" | "metadata" | "sizeBytes" | "uploadStatus"> & {
  kind: RegressionArtifactKind;
  data: unknown;
  sizeBytes?: number;
  uploadStatus?: RegressionArtifactUploadStatus;
  metadata?: unknown;
};

export type RegressionArtifactTreeNodeResponse = Omit<RegressionArtifactTreeNodeContract, "type" | "artifact" | "children" | "sizeBytes"> & {
  type: "folder" | "file";
  artifact?: RegressionArtifactResponse;
  children?: RegressionArtifactTreeNodeResponse[];
  sizeBytes?: number;
};

export type ListRegressionRunsResponse = Omit<ListRegressionRunsContractResponse, "runs"> & {
  runs: RegressionRunResponse[];
};

export type ListRegressionScenariosResponse = Omit<ListRegressionScenariosContractResponse, "scenarios"> & {
  scenarios: RegressionScenarioResponse[];
};

export type ListRegressionEventsResponse = Omit<ListRegressionEventsContractResponse, "events"> & {
  events: RegressionEventResponse[];
};

export type ListRegressionArtifactsResponse = Omit<ListRegressionArtifactsContractResponse, "artifacts" | "artifactTree"> & {
  artifacts: RegressionArtifactResponse[];
  artifactTree: RegressionArtifactTreeNodeResponse[];
};

export type RegressionArtifactUploadResponse = {
  message: string;
  artifact: RegressionArtifactResponse;
};

export type RegressionArtifactDownloadResponse = {
  content: Buffer;
  contentType: string;
  name: string;
};

export type ExtractedRegressionEvent = {
  stepId?: string;
  stepLabel?: string;
  stepType?: string;
  status?: string;
  logLevel?: string;
  hasFailure: boolean;
  hasHealing: boolean;
};

export const RegressionRunResponseSchema = z.object({
    id: z.string(),
    runId: z.string(),
    applicationId: z.string(),
    versionId: z.string().optional(),
    name: z.string(),
    nameNumber: z.number(),
    displayName: z.string(),
    status: RegressionRunStatusSchema,
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    durationMs: z.number().optional(),
    passedCount: z.number(),
    failedCount: z.number(),
    warningCount: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    summary: z.unknown().optional(),
  }) satisfies ZodType<RegressionRunResponse>;

export const RegressionScenarioResponseSchema = z.object({
    id: z.string(),
    runId: z.string(),
    scenarioKey: z.string(),
    featureName: z.string().optional(),
    scenarioName: z.string().optional(),
    title: z.string().optional(),
    file: z.string().optional(),
    line: z.number().optional(),
    status: RegressionScenarioStatusSchema,
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    durationMs: z.number().optional(),
    passedCount: z.number(),
    failedCount: z.number(),
    warningCount: z.number(),
  }) satisfies ZodType<RegressionScenarioResponse>;

export const RegressionEventResponseSchema = z.object({
    id: z.string(),
    runId: z.string(),
    scenarioId: z.string().optional(),
    type: z.string(),
    timestamp: z.string(),
    featureName: z.string().optional(),
    scenarioName: z.string().optional(),
    stepId: z.string().optional(),
    stepLabel: z.string().optional(),
    stepType: z.string().optional(),
    status: z.string().optional(),
    logLevel: z.string().optional(),
    hasFailure: z.boolean(),
    hasHealing: z.boolean(),
    payload: z.unknown(),
    runName: z.string().optional(),
  }) satisfies ZodType<RegressionEventResponse>;

export const RegressionArtifactResponseSchema = z.object({
    id: z.string(),
    runId: z.string(),
    scenarioId: z.string().optional(),
    kind: RegressionArtifactKindSchema,
    name: z.string(),
    data: z.unknown(),
    contentType: z.string().optional(),
    sizeBytes: z.number().optional(),
    storageProvider: z.string().optional(),
    storageUri: z.string().optional(),
    storagePath: z.string().optional(),
    checksumSha256: z.string().optional(),
    uploadStatus: RegressionArtifactUploadStatusSchema.optional(),
    uploadError: z.string().optional(),
    metadata: z.unknown().optional(),
    downloadUrl: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  }) satisfies ZodType<RegressionArtifactResponse>;

export const RegressionArtifactTreeNodeResponseSchema: ZodType<RegressionArtifactTreeNodeResponse> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
    type: z.enum(["folder", "file"]),
    artifact: RegressionArtifactResponseSchema.optional(),
    children: z.array(RegressionArtifactTreeNodeResponseSchema).optional(),
    artifactCount: z.number(),
    sizeBytes: z.number().optional(),
  }),
);

export const ListRegressionRunsResponseSchema = z.object({
    runs: z.array(RegressionRunResponseSchema),
    nextCursor: z.string().optional(),
  }) satisfies ZodType<ListRegressionRunsResponse>;

export const ListRegressionScenariosResponseSchema = z.object({
    scenarios: z.array(RegressionScenarioResponseSchema),
  }) satisfies ZodType<ListRegressionScenariosResponse>;

export const ListRegressionEventsResponseSchema = z.object({
    events: z.array(RegressionEventResponseSchema),
    nextCursor: z.string().optional(),
  }) satisfies ZodType<ListRegressionEventsResponse>;

export const ListRegressionArtifactsResponseSchema = z.object({
    artifacts: z.array(RegressionArtifactResponseSchema),
    artifactTree: z.array(RegressionArtifactTreeNodeResponseSchema),
  }) satisfies ZodType<ListRegressionArtifactsResponse>;

export const RegressionArtifactUploadResponseSchema = z.object({
    message: z.string(),
    artifact: RegressionArtifactResponseSchema,
  }) satisfies ZodType<RegressionArtifactUploadResponse>;
