// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { OAuthClientConfig, OAuthTokenResponse } from "@utils/oauth";
import type {
  JiraIssueProject as ContractJiraIssueProject,
  JiraIssueType as ContractJiraIssueType,
  JiraReportingConfig as ContractJiraReportingConfig,
  JiraReportingOptions as ContractJiraReportingOptions,
} from "@coveritlabs/contracts";
import type { Plain } from "@models/common";

export const JIRA_API_PROVIDER = "jira" as const;
export const JIRA_STORED_PROVIDER = "JIRA" as const;

export type IntegrationProvider = typeof JIRA_API_PROVIDER;
export type StoredIntegrationProvider = typeof JIRA_STORED_PROVIDER;

export interface IntegrationOAuthState {
  projectId: string;
  userId: string;
  provider: IntegrationProvider;
  siteUrl?: string;
  createdAt: string;
}

export interface JiraAccess {
  accessToken: string;
  cloudId: string;
  siteUrl?: string;
  tokenType: string;
}

export interface IntegrationConnectionData {
  jiraCloudId: string;
  jiraSiteName: string | null;
  jiraSiteUrl: string | null;
  scopes: string[];
  tokenType: string;
}

export type JiraReportingProject = Plain<ContractJiraIssueProject>;
export type JiraReportingIssueType = Plain<ContractJiraIssueType>;
export type JiraReportingConfig = Plain<ContractJiraReportingConfig>;

export type IntegrationReportingConfig = { case: typeof JIRA_API_PROVIDER; value: JiraReportingConfig } | { case: undefined; value?: undefined };

export type JiraReportingOptions = Plain<ContractJiraReportingOptions>;

export type IntegrationReportingOptions = { case: typeof JIRA_API_PROVIDER; value: JiraReportingOptions } | { case: undefined; value?: undefined };

export interface IntegrationProviderAdapter {
  apiProvider: IntegrationProvider;
  storedProvider: StoredIntegrationProvider;
  oauth: OAuthClientConfig;
  scopes: readonly string[];
  isConfigured: () => boolean;
  resolveConnection: (tokenData: OAuthTokenResponse, requestedSiteUrl?: string) => Promise<IntegrationConnectionData>;
  getReportingOptions?: (access: JiraAccess) => Promise<IntegrationReportingOptions>;
  normalizeReportingConfig?: (input: unknown, access: JiraAccess) => Promise<IntegrationReportingConfig>;
}
