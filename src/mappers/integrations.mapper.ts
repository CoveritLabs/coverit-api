// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { ProjectIntegration } from "@generated/prisma/client";
import type { IntegrationReportingConfig, IntegrationStatusResponse, JiraReportingConfig } from "@models/integrations";
import type { IntegrationProvider } from "types/integrations";
import { JIRA_API_PROVIDER } from "types/integrations";
import type { UserInfo } from "@models/user";

export function mapIntegrationStatus(
  integration: ProjectIntegration | null,
  authorizedByUser: UserInfo | null,
  provider: IntegrationProvider,
): IntegrationStatusResponse {
  if (!integration) {
    return { connected: false, provider, scopes: [], details: { case: undefined }, reportingConfig: { case: undefined } };
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
    reportingConfig: mapIntegrationReportingConfig(provider, (integration as any).reportingConfig),
  };
}

export function mapIntegrationReportingConfig(provider: IntegrationProvider, value: unknown): IntegrationReportingConfig {
  if (provider !== JIRA_API_PROVIDER) return { case: undefined };
  return { case: "jira", value: normalizeJiraReportingConfig(value) };
}

function normalizeJiraReportingConfig(value: unknown): JiraReportingConfig {
  const config = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
  const project = config.project && typeof config.project === "object" ? config.project as Record<string, any> : undefined;
  const issueType = config.issueType && typeof config.issueType === "object" ? config.issueType as Record<string, any> : undefined;

  return {
    enabled: Boolean(config.enabled && project?.id && project?.key && issueType?.id),
    project: project?.id && project?.key && project?.name
      ? { id: String(project.id), key: String(project.key), name: String(project.name) }
      : undefined,
    issueType: issueType?.id && issueType?.name
      ? { id: String(issueType.id), name: String(issueType.name) }
      : undefined,
  };
}
