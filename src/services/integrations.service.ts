// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import crypto from "crypto";

import { env } from "@config/env";
import { CACHE_LOG_CONTEXTS } from "@constants/logEvents";
import { INTEGRATIONS_MESSAGES } from "@constants/messages";
import { cacheDel, cacheGetString, cacheKeys, cacheSetString } from "@lib/cache";
import prisma from "@lib/prisma";
import { mapIntegrationReportingConfig, mapIntegrationStatus } from "@mappers/integrations.mapper";
import type {
  IntegrationReportingConfigResponse,
  IntegrationReportingOptionsResponse,
  StartIntegrationOAuthResponse,
  UpdateIntegrationReportingConfigBody,
} from "@models/integrations";
import { JIRA_API_PROVIDER, type IntegrationOAuthState, type IntegrationProvider, type JiraAccess } from "types/integrations";
import { getIntegrationProvider } from "integrations/providers";
import { decryptToken, encryptToken } from "@utils/crypto";
import { BadRequestError, NotFoundError } from "@utils/errors";
import { buildAuthorizationUrl, exchangeAuthorizationCode, getAccessTokenExpiry, parseScopes, refreshAccessToken } from "@utils/oauth";
import { buildRedirectUrl } from "@utils/redirect";
import { recordProjectActivities } from "@services/projectActivity.service";
import { getUser } from "./user.service";
import { assertProjectExists } from "./project.service";

const TOKEN_REFRESH_SKEW_MS = 60_000;

function assertProviderConfigured(isConfigured: boolean): void {
  if (!isConfigured) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.OAUTH_PROVIDER_NOT_CONFIGURED);
  }
}

function parseState(payload: string, expectedProvider: IntegrationProvider): IntegrationOAuthState {
  const state = JSON.parse(payload) as IntegrationOAuthState;
  if (state.provider !== expectedProvider || !state.projectId || !state.userId) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.OAUTH_STATE_INVALID);
  }

  return state;
}

export async function startOAuth(projectId: string, userId: string, provider: string): Promise<StartIntegrationOAuthResponse> {
  const config = getIntegrationProvider(provider);
  assertProviderConfigured(config.isConfigured());
  await assertProjectExists(projectId);

  const state = crypto.randomBytes(32).toString("base64url");
  const payload: IntegrationOAuthState = {
    projectId,
    userId,
    provider: config.apiProvider,
    createdAt: new Date().toISOString(),
  };

  await cacheSetString(
    cacheKeys.oauth.integrationState(config.apiProvider, state),
    JSON.stringify(payload),
    env.OAUTH_STATE_TTL_SECONDS,
    CACHE_LOG_CONTEXTS.INTEGRATIONS_WRITE_OAUTH_STATE,
  );

  return { authorizationUrl: buildAuthorizationUrl(config.oauth, state) };
}

export async function completeOAuth(provider: string, code: string, stateValue: string): Promise<string> {
  const config = getIntegrationProvider(provider);
  assertProviderConfigured(config.isConfigured());

  const stateKey = cacheKeys.oauth.integrationState(config.apiProvider, stateValue);
  const statePayload = await cacheGetString(stateKey, CACHE_LOG_CONTEXTS.INTEGRATIONS_READ_OAUTH_STATE);
  await cacheDel([stateKey], CACHE_LOG_CONTEXTS.INTEGRATIONS_DELETE_OAUTH_STATE);

  if (!statePayload) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.OAUTH_STATE_INVALID);
  }

  const state = parseState(statePayload, config.apiProvider);
  await assertProjectExists(state.projectId);

  const tokenData = await exchangeAuthorizationCode(config.oauth, code);
  const connection = await config.resolveConnection(tokenData, state.siteUrl);

  await prisma.projectIntegration.upsert({
    where: {
      projectId_provider: {
        projectId: state.projectId,
        provider: config.storedProvider,
      },
    },
    create: {
      projectId: state.projectId,
      provider: config.storedProvider,
      jiraCloudId: connection.jiraCloudId,
      jiraSiteName: connection.jiraSiteName,
      jiraSiteUrl: connection.jiraSiteUrl,
      scopes: connection.scopes,
      tokenType: connection.tokenType,
      encryptedAccessToken: encryptToken(tokenData.access_token!),
      encryptedRefreshToken: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
      accessTokenExpiresAt: getAccessTokenExpiry(tokenData.expires_in),
      authorizedByUserId: state.userId,
    },
    update: {
      jiraCloudId: connection.jiraCloudId,
      jiraSiteName: connection.jiraSiteName,
      jiraSiteUrl: connection.jiraSiteUrl,
      scopes: connection.scopes,
      tokenType: connection.tokenType,
      encryptedAccessToken: encryptToken(tokenData.access_token!),
      encryptedRefreshToken: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
      accessTokenExpiresAt: getAccessTokenExpiry(tokenData.expires_in),
      authorizedByUserId: state.userId,
      refreshedAt: null,
    },
  });

  await recordProjectActivities(
    [
      {
        projectId: state.projectId,
        eventType: "integration.connected",
        entityType: "project_integration",
        entityId: config.apiProvider,
        message: `Connected ${config.apiProvider} integration`,
        metadata: { provider: config.apiProvider, siteUrl: connection.jiraSiteUrl },
      },
    ],
    state.userId,
  );

  return buildRedirectUrl(env.FRONTEND_URL, `/projects/${state.projectId}/integrations`, {
    provider: config.apiProvider,
    status: "connected",
  });
}

export async function getIntegrationStatus(projectId: string, provider: string) {
  const config = getIntegrationProvider(provider);
  const integration = await prisma.projectIntegration.findUnique({
    where: { projectId_provider: { projectId, provider: config.storedProvider } },
  });

  if (!integration) {
    return mapIntegrationStatus(null, null, config.apiProvider);
  }

  const authorizedByUser = await getUser(integration?.authorizedByUserId!);

  return mapIntegrationStatus(integration, authorizedByUser, config.apiProvider);
}

export async function getReportingOptions(projectId: string, provider: string): Promise<IntegrationReportingOptionsResponse> {
  const config = getIntegrationProvider(provider);
  if (!config.getReportingOptions) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.UNSUPPORTED_PROVIDER);
  }

  const access = await getValidJiraAccess(projectId);
  const options = await config.getReportingOptions(access);
  return { provider: config.apiProvider, options };
}

export async function updateReportingConfig(
  projectId: string,
  provider: string,
  body: UpdateIntegrationReportingConfigBody,
): Promise<IntegrationReportingConfigResponse> {
  const config = getIntegrationProvider(provider);
  if (!config.normalizeReportingConfig) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.UNSUPPORTED_PROVIDER);
  }
  if (body.config.case !== config.apiProvider) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.UNSUPPORTED_PROVIDER);
  }

  const access = await getValidJiraAccess(projectId);
  const normalized = await config.normalizeReportingConfig(body.config.value, access);

  await prisma.projectIntegration.update({
    where: { projectId_provider: { projectId, provider: config.storedProvider } },
    data: { reportingConfig: normalized.value as any },
  });

  return { provider: config.apiProvider, config: normalized };
}

export async function getReportingConfig(projectId: string, provider: string): Promise<IntegrationReportingConfigResponse> {
  const config = getIntegrationProvider(provider);
  const integration = await prisma.projectIntegration.findUnique({
    where: { projectId_provider: { projectId, provider: config.storedProvider } },
  });
  if (!integration) throw new NotFoundError(INTEGRATIONS_MESSAGES.JIRA_NOT_CONNECTED);

  return {
    provider: config.apiProvider,
    config: mapIntegrationReportingConfig(config.apiProvider, (integration as any).reportingConfig),
  };
}

export async function disconnectIntegration(projectId: string, provider: string): Promise<{ message: string }> {
  const config = getIntegrationProvider(provider);
  await prisma.projectIntegration.deleteMany({
    where: { projectId, provider: config.storedProvider },
  });

  return { message: INTEGRATIONS_MESSAGES.JIRA_DISCONNECT_SUCCESS };
}

export async function getValidJiraAccess(projectId: string): Promise<JiraAccess> {
  const config = getIntegrationProvider(JIRA_API_PROVIDER);
  assertProviderConfigured(config.isConfigured());

  const integration = await prisma.projectIntegration.findUnique({
    where: { projectId_provider: { projectId, provider: config.storedProvider } },
  });

  if (!integration) {
    throw new NotFoundError(INTEGRATIONS_MESSAGES.JIRA_NOT_CONNECTED);
  }

  const expiresAt = integration.accessTokenExpiresAt ? new Date(integration.accessTokenExpiresAt).getTime() : 0;
  if (expiresAt > Date.now() + TOKEN_REFRESH_SKEW_MS) {
    return {
      accessToken: decryptToken(integration.encryptedAccessToken),
      cloudId: integration.jiraCloudId,
      siteUrl: integration.jiraSiteUrl ?? undefined,
      tokenType: integration.tokenType,
    };
  }

  if (!integration.encryptedRefreshToken) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.OAUTH_REFRESH_FAILED);
  }

  const tokenData = await refreshAccessToken(config.oauth, decryptToken(integration.encryptedRefreshToken));
  const encryptedAccessToken = encryptToken(tokenData.access_token!);
  const encryptedRefreshToken = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : integration.encryptedRefreshToken;

  await prisma.projectIntegration.update({
    where: { id: integration.id },
    data: {
      scopes: parseScopes(tokenData.scope, config.scopes),
      tokenType: tokenData.token_type ?? integration.tokenType,
      encryptedAccessToken,
      encryptedRefreshToken,
      accessTokenExpiresAt: getAccessTokenExpiry(tokenData.expires_in),
      refreshedAt: new Date(),
    },
  });

  return {
    accessToken: tokenData.access_token!,
    cloudId: integration.jiraCloudId,
    siteUrl: integration.jiraSiteUrl ?? undefined,
    tokenType: tokenData.token_type ?? integration.tokenType,
  };
}
