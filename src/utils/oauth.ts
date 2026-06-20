// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { INTEGRATIONS_MESSAGES } from "@constants/messages";
import { BadRequestError } from "@utils/errors";

export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  authorizeParams?: Record<string, string>;
}

export interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
}

export function buildAuthorizationUrl(config: OAuthClientConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: "code",
    scope: config.scope,
    state,
    ...(config.authorizeParams ?? {}),
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}

async function postTokenRequest(config: OAuthClientConfig, body: Record<string, string>, errorMessage: string): Promise<OAuthTokenResponse> {
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
  });

  if (!response.ok) {
    throw new BadRequestError(errorMessage);
  }

  const tokenData = (await response.json()) as OAuthTokenResponse;
  if (tokenData.error || !tokenData.access_token) {
    throw new BadRequestError(errorMessage);
  }

  return tokenData;
}

export function exchangeAuthorizationCode(config: OAuthClientConfig, code: string): Promise<OAuthTokenResponse> {
  return postTokenRequest(
    config,
    {
      grant_type: "authorization_code",
      code,
      redirect_uri: config.callbackUrl,
    },
    INTEGRATIONS_MESSAGES.OAUTH_TOKEN_EXCHANGE_FAILED,
  );
}

export function refreshAccessToken(config: OAuthClientConfig, refreshToken: string): Promise<OAuthTokenResponse> {
  return postTokenRequest(
    config,
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    INTEGRATIONS_MESSAGES.OAUTH_REFRESH_FAILED,
  );
}

export function parseScopes(scope: string | undefined, fallbackScopes: readonly string[]): string[] {
  return scope ? scope.split(" ").filter(Boolean) : [...fallbackScopes];
}

export function getAccessTokenExpiry(expiresIn?: number): Date | null {
  return typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000) : null;
}
