// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { env } from "@config/env";
import { INTEGRATIONS_MESSAGES } from "@constants/messages";
import {
  JIRA_API_PROVIDER,
  JIRA_STORED_PROVIDER,
  type IntegrationProviderAdapter,
  type IntegrationReportingConfig,
  type IntegrationReportingOptions,
  type JiraAccess,
  type JiraReportingIssueType,
  type JiraReportingProject,
} from "types/integrations";
import { BadRequestError } from "@utils/errors";
import { parseScopes } from "@utils/oauth";
import { normalizeUrlOrigin } from "@utils/url";

const ATLASSIAN_AUTHORIZE_URL = "https://auth.atlassian.com/authorize";
const ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const ATLASSIAN_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources";
const ATLASSIAN_JIRA_API_BASE = "https://api.atlassian.com/ex/jira";
const JIRA_SCOPES = ["read:jira-work", "write:jira-work", "offline_access"] as const;

interface AtlassianAccessibleResource {
  id: string;
  url?: string;
  name?: string;
  scopes?: string[];
}

interface JiraProjectSearchResponse {
  values?: Array<{
    id?: string;
    key?: string;
    name?: string;
    issueTypes?: Array<{ id?: string; name?: string }>;
  }>;
}

async function getAccessibleResources(accessToken: string): Promise<AtlassianAccessibleResource[]> {
  const response = await fetch(ATLASSIAN_RESOURCES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.OAUTH_ACCESSIBLE_RESOURCES_FAILED);
  }

  return (await response.json()) as AtlassianAccessibleResource[];
}

async function jiraApiFetch<T>(access: JiraAccess, path: string): Promise<T> {
  const response = await fetch(`${ATLASSIAN_JIRA_API_BASE}/${access.cloudId}${path}`, {
    headers: {
      Authorization: `${access.tokenType} ${access.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new BadRequestError(`${INTEGRATIONS_MESSAGES.JIRA_API_REQUEST_FAILED}: ${response.status}`);
  }

  return await response.json() as T;
}

async function getJiraReportingOptions(access: JiraAccess): Promise<IntegrationReportingOptions> {
  const response = await jiraApiFetch<JiraProjectSearchResponse>(
    access,
    "/rest/api/3/project/search?expand=issueTypes&maxResults=100",
  );
  const projects: JiraReportingProject[] = [];
  const issueTypeMap = new Map<string, JiraReportingIssueType>();

  for (const project of response.values ?? []) {
    if (!project.id || !project.key || !project.name) continue;
    projects.push({ id: project.id, key: project.key, name: project.name });

    for (const issueType of project.issueTypes ?? []) {
      if (!issueType.id || !issueType.name) continue;
      issueTypeMap.set(issueType.id, { id: issueType.id, name: issueType.name });
    }
  }

  return {
    case: "jira",
    value: {
      projects,
      issueTypes: [...issueTypeMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    },
  };
}

async function normalizeJiraReportingConfig(input: unknown, access: JiraAccess): Promise<IntegrationReportingConfig> {
  const config = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, any> : {};
  const projectInput = config.project && typeof config.project === "object" ? config.project as Record<string, any> : {};
  const issueTypeInput = config.issueType && typeof config.issueType === "object" ? config.issueType as Record<string, any> : {};

  const options = await getJiraReportingOptions(access);
  if (options.case !== "jira") {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.JIRA_REPORTING_CONFIG_INVALID);
  }
  const project = options.value.projects.find((candidate) => candidate.id === projectInput.id || candidate.key === projectInput.key);
  const issueType = options.value.issueTypes.find((candidate) => candidate.id === issueTypeInput.id);

  if (!project || !issueType) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.JIRA_REPORTING_CONFIG_INVALID);
  }

  return {
    case: "jira",
    value: {
      enabled: config.enabled !== false,
      project,
      issueType,
    },
  };
}

function selectJiraResource(resources: AtlassianAccessibleResource[], requestedSiteUrl?: string): AtlassianAccessibleResource {
  const jiraResources = resources.filter((resource) => resource.scopes?.some((scope) => scope.includes("jira")) ?? false);
  const normalizedRequestedUrl = normalizeUrlOrigin(requestedSiteUrl);

  if (normalizedRequestedUrl) {
    const resource = jiraResources.find((candidate) => normalizeUrlOrigin(candidate.url) === normalizedRequestedUrl);
    if (!resource) {
      throw new BadRequestError(INTEGRATIONS_MESSAGES.OAUTH_SITE_NOT_GRANTED);
    }
    return resource;
  }

  if (jiraResources.length === 0) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.OAUTH_NO_JIRA_SITE);
  }

  if (jiraResources.length > 1) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.OAUTH_MULTIPLE_JIRA_SITES);
  }

  return jiraResources[0];
}

export const jiraIntegrationProvider: IntegrationProviderAdapter = {
  apiProvider: JIRA_API_PROVIDER,
  storedProvider: JIRA_STORED_PROVIDER,
  oauth: {
    clientId: env.ATLASSIAN_CLIENT_ID,
    clientSecret: env.ATLASSIAN_CLIENT_SECRET,
    callbackUrl: env.ATLASSIAN_CALLBACK_URL,
    authorizeUrl: ATLASSIAN_AUTHORIZE_URL,
    tokenUrl: ATLASSIAN_TOKEN_URL,
    scope: JIRA_SCOPES.join(" "),
    authorizeParams: {
      audience: "api.atlassian.com",
      prompt: "consent",
    },
  },
  scopes: JIRA_SCOPES,
  isConfigured: () => Boolean(env.ATLASSIAN_CLIENT_ID && env.ATLASSIAN_CLIENT_SECRET && env.ATLASSIAN_CALLBACK_URL),
  resolveConnection: async (tokenData, requestedSiteUrl) => {
    const resources = await getAccessibleResources(tokenData.access_token!);
    const resource = selectJiraResource(resources, requestedSiteUrl);

    return {
      jiraCloudId: resource.id,
      jiraSiteName: resource.name ?? null,
      jiraSiteUrl: resource.url ?? null,
      scopes: parseScopes(tokenData.scope, JIRA_SCOPES),
      tokenType: tokenData.token_type ?? "Bearer",
    };
  },
  getReportingOptions: getJiraReportingOptions,
  normalizeReportingConfig: normalizeJiraReportingConfig,
};
