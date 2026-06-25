// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Integrations domain DTOs

import type {
  IntegrationReportingConfigResponse as ContractIntegrationReportingConfigResponse,
  IntegrationReportingOptionsResponse as ContractIntegrationReportingOptionsResponse,
  IntegrationStatusResponse as ContractIntegrationStatusResponse,
  JiraIntegrationDetails as ContractJiraIntegrationDetails,
  JiraIssueProject as ContractJiraIssueProject,
  JiraIssueType as ContractJiraIssueType,
  JiraReportingConfig as ContractJiraReportingConfig,
  JiraReportingOptions as ContractJiraReportingOptions,
  StartIntegrationOAuthResponse as ContractStartIntegrationOAuthResponse,
  UpdateIntegrationReportingConfigRequest as ContractUpdateIntegrationReportingConfigRequest,
} from "@coveritlabs/contracts";
import type { IntegrationProvider } from "types/integrations";
import { z } from "@utils/zod";
import type { infer as ZodInfer } from "zod";
import type { Plain } from "./common";

export type StartIntegrationOAuthResponse = Plain<ContractStartIntegrationOAuthResponse>;
export type JiraIntegrationDetails = Plain<ContractJiraIntegrationDetails>;
export type IntegrationDetails = { case: "jira"; value: JiraIntegrationDetails } | { case: undefined; value?: undefined };
export type JiraIssueProject = Plain<ContractJiraIssueProject>;
export type JiraIssueType = Plain<ContractJiraIssueType>;
export type JiraReportingConfig = Plain<ContractJiraReportingConfig>;
export type JiraReportingOptions = Plain<ContractJiraReportingOptions>;
export type IntegrationStatusReportingConfig = Plain<ContractIntegrationStatusResponse>["reportingConfig"];
export type IntegrationReportingConfig = Plain<ContractIntegrationReportingConfigResponse>["config"];
export type IntegrationReportingOptions = Plain<ContractIntegrationReportingOptionsResponse>["options"];
export type IntegrationStatusResponse = Omit<Plain<ContractIntegrationStatusResponse>, "provider" | "details" | "reportingConfig"> & {
  provider: IntegrationProvider;
  details: IntegrationDetails;
  reportingConfig: IntegrationStatusReportingConfig;
};

export type IntegrationReportingConfigResponse = Omit<Plain<ContractIntegrationReportingConfigResponse>, "provider" | "config"> & {
  provider: IntegrationProvider;
  config: IntegrationReportingConfig;
};

export type IntegrationReportingOptionsResponse = Omit<Plain<ContractIntegrationReportingOptionsResponse>, "provider" | "options"> & {
  provider: IntegrationProvider;
  options: IntegrationReportingOptions;
};

export const JiraIssueProjectSchema = z.object({
  id: z.requiredString("Jira project id is required"),
  key: z.requiredString("Jira project key is required"),
  name: z.requiredString("Jira project name is required"),
});

export const JiraIssueTypeSchema = z.object({
  id: z.requiredString("Jira issue type id is required"),
  name: z.requiredString("Jira issue type name is required"),
  projectId: z.requiredString("Jira issue type project id is required"),
});

export const JiraReportingConfigSchema = z.object({
  enabled: z.boolean(),
  project: JiraIssueProjectSchema.optional(),
  issueType: JiraIssueTypeSchema.optional(),
});

export const JiraReportingOptionsSchema = z.object({
  projects: z.array(JiraIssueProjectSchema),
  issueTypes: z.array(JiraIssueTypeSchema),
});

export const IntegrationReportingConfigSchema = z.union([z.object({ case: z.literal("jira"), value: JiraReportingConfigSchema }), z.object({})]);

export const IntegrationStatusReportingConfigSchema = z.union([
  z.object({ case: z.literal("jiraReportingConfig"), value: JiraReportingConfigSchema }),
  z.object({}),
]);

export const IntegrationReportingOptionsSchema = z.union([z.object({ case: z.literal("jira"), value: JiraReportingOptionsSchema }), z.object({})]);

export const StartIntegrationOAuthResponseSchema = z.object({ authorizationUrl: z.string().url() });

export const IntegrationStatusResponseSchema = z.object({
  connected: z.boolean(),
  provider: z.literal("jira"),
  scopes: z.array(z.string()),
  authorizedByUser: z.unknown().optional(),
  accessTokenExpiresAt: z.string().optional(),
  refreshedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  details: z.union([
    z.object({
      case: z.literal("jira"),
      value: z.object({
        cloudId: z.string(),
        siteName: z.string().optional(),
        siteUrl: z.string().optional(),
      }),
    }),
    z.object({}),
  ]),
  reportingConfig: IntegrationStatusReportingConfigSchema,
});

export const IntegrationReportingConfigResponseSchema = z.object({
  provider: z.literal("jira"),
  config: IntegrationReportingConfigSchema,
});

export const IntegrationReportingOptionsResponseSchema = z.object({
  provider: z.literal("jira"),
  options: IntegrationReportingOptionsSchema,
});

const UpdateJiraReportingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  project: JiraIssueProjectSchema,
  issueType: JiraIssueTypeSchema,
});

export const UpdateIntegrationReportingConfigBodySchema = z.object({
  config: z.object({
    case: z.literal("jira"),
    value: UpdateJiraReportingConfigSchema,
  }),
});

export type UpdateIntegrationReportingConfigBody = Plain<ContractUpdateIntegrationReportingConfigRequest> &
  ZodInfer<typeof UpdateIntegrationReportingConfigBodySchema>;
