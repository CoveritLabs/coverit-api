// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type {
  ScenarioIntegrationReportProvider,
  ScenarioIntegrationReportResponse,
  ScenarioIntegrationReportStatus,
} from "@models/scenarioReports";

export type DbScenarioIntegrationReportStatus = "PENDING" | "CREATING" | "ATTACHING" | "CREATED" | "FAILED";

export function mapScenarioIntegrationReport(report: any): ScenarioIntegrationReportResponse {
  const provider = toPublicProvider(report.provider);
  return {
    id: report.id,
    projectId: report.projectId,
    runId: report.runDbId,
    scenarioId: report.scenarioId,
    provider,
    status: toPublicReportStatus(report.status),
    title: report.title,
    description: report.description,
    reporterUserId: report.reporterUserId,
    reporterEmail: report.reporterEmail,
    artifactIds: report.artifactIds ?? [],
    attachedArtifactIds: report.attachedArtifactIds ?? [],
    externalIssueKey: report.externalIssueKey ?? undefined,
    externalIssueUrl: report.externalIssueUrl ?? undefined,
    lastError: report.lastError ?? undefined,
    attemptCount: report.attemptCount ?? 0,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    details: provider === "jira"
      ? {
        case: "jira",
        value: {
          issueKey: report.externalIssueKey ?? undefined,
          issueUrl: report.externalIssueUrl ?? undefined,
        },
      }
      : { case: undefined },
  };
}

export function toDbReportStatus(status: ScenarioIntegrationReportStatus): DbScenarioIntegrationReportStatus {
  return status.toUpperCase() as DbScenarioIntegrationReportStatus;
}

export function toPublicReportStatus(status: string): ScenarioIntegrationReportStatus {
  return status.toLowerCase() as ScenarioIntegrationReportStatus;
}

export function toPublicProvider(provider: string): ScenarioIntegrationReportProvider {
  return provider.toLowerCase() as ScenarioIntegrationReportProvider;
}

export function toStoredReportProvider(provider: string): string {
  return provider.toUpperCase();
}
