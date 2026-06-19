// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { ProjectIntegration } from "@generated/prisma/client";
import type { IntegrationStatusResponse } from "@models/integrations";
import type { IntegrationProvider } from "types/integrations";
import type { UserInfo } from "@models/user";

export function mapIntegrationStatus(
  integration: ProjectIntegration | null,
  authorizedByUser: UserInfo | null,
  provider: IntegrationProvider,
): IntegrationStatusResponse {
  if (!integration) {
    return { connected: false, provider, scopes: [], details: { case: undefined } };
  }

  return {
    connected: true,
    provider,
    scopes: integration.scopes ?? [],
    authorizedByUser: authorizedByUser!,
    accessTokenExpiresAt: integration.accessTokenExpiresAt?.toISOString(),
    refreshedAt: integration.refreshedAt?.toISOString(),
    createdAt: integration.createdAt?.toISOString(),
    updatedAt: integration.updatedAt?.toISOString(),
    details: {
      case: "jira",
      value: {
        cloudId: integration.jiraCloudId,
        siteName: integration.jiraSiteName ?? undefined,
        siteUrl: integration.jiraSiteUrl ?? undefined,
      },
    },
  };
}
