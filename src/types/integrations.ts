// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { OAuthClientConfig, OAuthTokenResponse } from "@utils/oauth";

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

export interface IntegrationProviderAdapter {
  apiProvider: IntegrationProvider;
  storedProvider: StoredIntegrationProvider;
  oauth: OAuthClientConfig;
  scopes: readonly string[];
  isConfigured: () => boolean;
  resolveConnection: (tokenData: OAuthTokenResponse, requestedSiteUrl?: string) => Promise<IntegrationConnectionData>;
}
