// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { env } from "@config/env";
import { INTEGRATIONS_MESSAGES } from "@constants/messages";
import { JIRA_API_PROVIDER, JIRA_STORED_PROVIDER, type IntegrationProviderAdapter } from "types/integrations";
import { BadRequestError } from "@utils/errors";
import { parseScopes } from "@utils/oauth";
import { normalizeUrlOrigin } from "@utils/url";

const ATLASSIAN_AUTHORIZE_URL = "https://auth.atlassian.com/authorize";
const ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const ATLASSIAN_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources";
const JIRA_SCOPES = ["read:jira-work", "write:jira-work", "offline_access"] as const;

interface AtlassianAccessibleResource {
  id: string;
  url?: string;
  name?: string;
  scopes?: string[];
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
};
