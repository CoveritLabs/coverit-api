// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { SCENARIO_REPORT_VALIDATION } from "@constants/messages";
import type {
  CreateScenarioIntegrationReportRequest as ContractCreateScenarioIntegrationReportRequest,
  InternalClaimScenarioReportRequest as ContractInternalClaimScenarioReportRequest,
  InternalPatchScenarioReportRequest as ContractInternalPatchScenarioReportRequest,
  InternalScenarioReportAccess as ContractInternalScenarioReportAccess,
  InternalScenarioReportArtifact as ContractInternalScenarioReportArtifact,
  InternalScenarioReportContextResponse as ContractInternalScenarioReportContextResponse,
  JiraScenarioIntegrationReportDetails as ContractJiraScenarioIntegrationReportDetails,
  ManualSessionBugReportPayload as ContractManualSessionBugReportPayload,
  ManualSessionFlowCompletedPayload as ContractManualSessionFlowCompletedPayload,
  ScenarioIntegrationReport as ContractScenarioIntegrationReport,
  ScenarioIntegrationReportResponse as ContractScenarioIntegrationReportResponse,
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { infer as ZodInfer, ZodType } from "zod";
import type { Plain } from "./common";

export const ScenarioIntegrationReportProviderSchema = z.enum(["jira"]);
export const ScenarioIntegrationReportStatusSchema = z.enum(["pending", "creating", "attaching", "created", "failed"]);

export const CreateScenarioIntegrationReportBodySchema = z.object({
  title: z.requiredString(SCENARIO_REPORT_VALIDATION.TITLE_REQUIRED),
  description: z.requiredString(SCENARIO_REPORT_VALIDATION.DESCRIPTION_REQUIRED),
  artifactIds: z.array(z.string()).default([]),
});

export const InternalClaimScenarioReportBodySchema = z.object({
  reportId: z.string().optional(),
  provider: ScenarioIntegrationReportProviderSchema.optional(),
});

export const InternalPatchScenarioReportBodySchema = z.object({
  status: ScenarioIntegrationReportStatusSchema.optional(),
  externalIssueKey: z.string().nullable().optional(),
  externalIssueUrl: z.string().nullable().optional(),
  attachedArtifactIds: z.array(z.string()).optional(),
  lastError: z.string().nullable().optional(),
  providerData: z.unknown().optional(),
});

export const InternalCreateManualBugReportBodySchema = z.object({
  sessionId: z.uuid(),
  flowId: z.uuid(),
  checkpointHash: z.requiredString("checkpointHash is required"),
  transitionIds: z.array(z.requiredString("transition id is required")).min(1),
  summary: z.requiredString(SCENARIO_REPORT_VALIDATION.TITLE_REQUIRED).max(4000),
  severity: z.requiredString("severity is required").max(50),
  currentUrl: z.string().max(2048).optional().default(""),
  recordedEvents: z.array(z.unknown()).optional().default([]),
  provider: ScenarioIntegrationReportProviderSchema.optional().default("jira"),
});

export const JiraScenarioIntegrationReportDetailsSchema = z.object({
  issueKey: z.string().optional(),
  issueUrl: z.string().optional(),
});

export const ScenarioIntegrationReportDetailsSchema = z.union([
  z.object({ case: z.literal("jira"), value: JiraScenarioIntegrationReportDetailsSchema }),
  z.object({}),
]) as unknown as ZodType<ScenarioIntegrationReportDetails>;

export const ScenarioIntegrationReportResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  runId: z.string(),
  scenarioId: z.string(),
  provider: ScenarioIntegrationReportProviderSchema,
  status: ScenarioIntegrationReportStatusSchema,
  title: z.string(),
  description: z.string(),
  reporterUserId: z.string(),
  reporterEmail: z.string(),
  artifactIds: z.array(z.string()),
  attachedArtifactIds: z.array(z.string()),
  externalIssueKey: z.string().optional(),
  externalIssueUrl: z.string().optional(),
  lastError: z.string().optional(),
  attemptCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  details: ScenarioIntegrationReportDetailsSchema,
});

export const CreateScenarioIntegrationReportResponseSchema = z.object({
  report: ScenarioIntegrationReportResponseSchema,
});

export const InternalScenarioReportAccessSchema = z.object({
  provider: ScenarioIntegrationReportProviderSchema,
  tokenType: z.string(),
  accessToken: z.string(),
  cloudId: z.string(),
  siteUrl: z.string().optional(),
});

export const InternalScenarioReportArtifactSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentType: z.string().optional(),
  sizeBytes: z.number().optional(),
});

export const ScenarioReportDescriptionBlockSchema = z.object({
  key: z.string(),
  type: z.enum(["paragraph", "metadata"]),
  title: z.string(),
  text: z.string(),
});

export const StructuredScenarioReportDescriptionSchema = z.object({
  summary: z.string(),
  metadata: z.object({
    reportId: z.string(),
    scenarioId: z.string(),
    runId: z.string(),
    provider: ScenarioIntegrationReportProviderSchema,
    reporterEmail: z.string(),
  }),
  footer: z.string(),
  blocks: z.array(ScenarioReportDescriptionBlockSchema),
});

export const InternalScenarioReportContextResponseSchema = z.object({
  report: ScenarioIntegrationReportResponseSchema,
  access: InternalScenarioReportAccessSchema,
  reportingConfig: z.unknown(),
  artifacts: z.array(InternalScenarioReportArtifactSchema),
  structuredDescription: StructuredScenarioReportDescriptionSchema,
  applicationName: z.string().optional(),
});

export type ScenarioIntegrationReportProvider = ZodInfer<typeof ScenarioIntegrationReportProviderSchema>;
export type ScenarioIntegrationReportStatus = ZodInfer<typeof ScenarioIntegrationReportStatusSchema>;
export type CreateScenarioIntegrationReportBody = Plain<ContractCreateScenarioIntegrationReportRequest>;
export type InternalClaimScenarioReportBody = Omit<Plain<ContractInternalClaimScenarioReportRequest>, "provider"> & {
  provider?: ScenarioIntegrationReportProvider;
};
export type InternalPatchScenarioReportBody = Omit<
  Plain<ContractInternalPatchScenarioReportRequest>,
  "status" | "externalIssueKey" | "externalIssueUrl" | "attachedArtifactIds" | "lastError" | "providerData"
> & {
  status?: ScenarioIntegrationReportStatus;
  externalIssueKey?: string | null;
  externalIssueUrl?: string | null;
  attachedArtifactIds?: string[];
  lastError?: string | null;
  providerData?: unknown;
};
export type InternalCreateManualBugReportBody = Omit<
  Plain<ContractManualSessionFlowCompletedPayload>,
  "testFlowType" | "$typeName"
> &
  Omit<Plain<ContractManualSessionBugReportPayload>, "includeScreenshot" | "includeSteps" | "$typeName"> & {
    currentUrl: string;
    recordedEvents: unknown[];
    provider: ScenarioIntegrationReportProvider;
  };

export type JiraScenarioIntegrationReportDetails = Plain<ContractJiraScenarioIntegrationReportDetails>;

export type ScenarioIntegrationReportDetails =
  | { case: "jira"; value: JiraScenarioIntegrationReportDetails }
  | { case: undefined; value?: undefined };

export type ScenarioIntegrationReportResponse = Omit<Plain<ContractScenarioIntegrationReport>, "provider" | "status" | "details"> & {
  provider: ScenarioIntegrationReportProvider;
  status: ScenarioIntegrationReportStatus;
  details: ScenarioIntegrationReportDetails;
};

export type CreateScenarioIntegrationReportResponse = Omit<Plain<ContractScenarioIntegrationReportResponse>, "report"> & {
  report: ScenarioIntegrationReportResponse;
};

export type InternalScenarioReportAccess = Omit<Plain<ContractInternalScenarioReportAccess>, "provider"> & {
  provider: ScenarioIntegrationReportProvider;
};

export type InternalScenarioReportArtifact = Omit<Plain<ContractInternalScenarioReportArtifact>, "sizeBytes"> & {
  sizeBytes?: number;
};

export type ScenarioReportDescriptionBlock = ZodInfer<typeof ScenarioReportDescriptionBlockSchema>;
export type StructuredScenarioReportDescription = ZodInfer<typeof StructuredScenarioReportDescriptionSchema>;

export type InternalScenarioReportContextResponse = Omit<
  Plain<ContractInternalScenarioReportContextResponse>,
  "report" | "access" | "reportingConfig" | "artifacts"
> & {
  report: ScenarioIntegrationReportResponse;
  access: InternalScenarioReportAccess;
  reportingConfig: unknown;
  artifacts: InternalScenarioReportArtifact[];
  structuredDescription: StructuredScenarioReportDescription;
  applicationName?: string;
};
