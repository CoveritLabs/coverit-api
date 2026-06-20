// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

/**
 * HTTP response message strings for the Integrations domain.
 */
export const INTEGRATIONS_MESSAGES = {
  UNSUPPORTED_PROVIDER: "Unsupported integration provider",
  JIRA_NOT_CONNECTED: "Jira integration is not connected",
  JIRA_DISCONNECT_SUCCESS: "Jira integration disconnected successfully",
  OAUTH_PROVIDER_NOT_CONFIGURED: "Jira OAuth provider is not configured",
  OAUTH_STATE_INVALID: "Invalid or expired OAuth state",
  OAUTH_CODE_MISSING: "Authorization code missing from callback",
  OAUTH_CANCELLED: "OAuth flow was cancelled by the user",
  OAUTH_TOKEN_EXCHANGE_FAILED: "Failed to exchange authorization code for Jira tokens",
  OAUTH_ACCESSIBLE_RESOURCES_FAILED: "Failed to retrieve Jira accessible resources",
  OAUTH_NO_JIRA_SITE: "No Jira site was granted for this authorization",
  OAUTH_MULTIPLE_JIRA_SITES: "Multiple Jira sites were granted; choose a site before connecting",
  OAUTH_SITE_NOT_GRANTED: "Requested Jira site was not granted",
  OAUTH_REFRESH_FAILED: "Failed to refresh Jira access token",
  JIRA_API_REQUEST_FAILED: "Jira API request failed",
  JIRA_REPORTING_CONFIG_INVALID: "Jira reporting configuration is invalid",
  TOKEN_ENCRYPTION_NOT_CONFIGURED: "OAuth token encryption key is not configured",
  OAUTH_FAILED: "Integration OAuth failed",
} as const;
