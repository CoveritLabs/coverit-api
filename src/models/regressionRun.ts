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
  RegressionEvent as ContractRegressionEvent,
  RegressionRun as ContractRegressionRun,
  RegressionRunSummary as ContractRegressionRunSummary,
  RegressionScenario as ContractRegressionScenario,
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { infer as ZodInfer } from "zod";
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
export type RegressionRunListQuery = ZodInfer<typeof RegressionRunListQuerySchema>;
export type RegressionEventListQuery = ZodInfer<typeof RegressionEventListQuerySchema>;
export type RegressionArtifactListQuery = ZodInfer<typeof RegressionArtifactListQuerySchema>;
export type RegressionArtifactUploadFields = ZodInfer<typeof RegressionArtifactUploadFieldsSchema>;

export type RegressionRunContract = Plain<ContractRegressionRun>;
export type RegressionScenarioContract = Plain<ContractRegressionScenario>;
export type RegressionEventContract = Plain<ContractRegressionEvent>;
export type RegressionArtifactContract = Plain<ContractRegressionArtifact>;
export type RegressionRunSummaryContract = Plain<ContractRegressionRunSummary>;
export type ListRegressionRunsRequest = Plain<ContractListRegressionRunsRequest>;
export type ListRegressionRunsResponse = Plain<ContractListRegressionRunsResponse>;
export type ListRegressionScenariosResponse = Plain<ContractListRegressionScenariosResponse>;
export type ListRegressionEventsResponse = Plain<ContractListRegressionEventsResponse>;
export type ListRegressionArtifactsResponse = Plain<ContractListRegressionArtifactsResponse>;
