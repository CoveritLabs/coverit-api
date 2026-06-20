// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type {
  ScenarioIntegrationReportProvider,
  ScenarioIntegrationReportResponse,
  ScenarioIntegrationReportStatus,
  ScenarioReportDescriptionBlock,
  StructuredScenarioReportDescription,
} from "@models/scenarioReports";
import { asRecord, stringValue } from "@utils/object";

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

export function cleanReportDescription(description: string | undefined): string {
  return description?.trim() ?? "";
}

export function mapStructuredScenarioReportDescription(report: any): StructuredScenarioReportDescription {
  const summary = cleanReportDescription(report.description);
  const reporterEmail = stringValue(report.reporterEmail) ?? "unknown";
  const blocks: ScenarioReportDescriptionBlock[] = [
    { key: "description", type: "paragraph", title: "Description", text: summary },
    { key: "reporter", type: "metadata", title: "Reporter", text: reporterEmail },
    { key: "source", type: "metadata", title: "Source", text: "Generated automatically by CoverIt" },
  ];

  return {
    summary,
    metadata: {
      reportId: stringValue(report.id) ?? "",
      scenarioId: stringValue(report.scenarioId) ?? "",
      runId: stringValue(report.runDbId) ?? "",
      provider: toPublicProvider(stringValue(report.provider) ?? ""),
      reporterEmail,
    },
    footer: "Generated automatically by CoverIt.",
    blocks,
  };
}

export function isReportableScenario(scenario: any): boolean {
  return scenario.status === "FAILED" || (scenario.status === "PASSED" && scenario.warningCount > 0);
}

export function selectScenarioArtifacts(artifacts: any[], scenario: any): any[] {
  const directArtifacts = artifacts.filter((artifact) => artifact.scenarioId === scenario.id);
  const prefixes = scenarioArtifactPrefixes(directArtifacts, scenario);
  const selected = new Set<string>();

  for (const artifact of directArtifacts) selected.add(artifact.id);
  for (const artifact of artifacts) {
    if (artifact.scenarioId) continue;
    const relativePath = artifactRelativePath(artifact);
    if (relativePath && prefixes.some((prefix) => relativePath.startsWith(prefix))) selected.add(artifact.id);
  }

  return artifacts.filter((artifact) => selected.has(artifact.id));
}

export function artifactRelativePath(artifact: any): string | undefined {
  const metadata = asRecord(artifact.metadata);
  return stringValue(metadata.relativePath)?.replace(/\\/g, "/");
}

export function isDownloadableArtifact(artifact: any): boolean {
  return (
    artifact.uploadStatus === "UPLOADED" &&
    Boolean(artifact.storagePath) &&
    Boolean(artifact.storageUri) &&
    Boolean(artifact.contentType) &&
    artifact.sizeBytes != null
  );
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
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

function scenarioArtifactPrefixes(directArtifacts: any[], scenario: any): string[] {
  const prefixes = new Set<string>();
  for (const artifact of directArtifacts) {
    const relativePath = artifactRelativePath(artifact);
    const prefix = relativePath?.match(/^(playwright\/scenarios\/[^/]+\/)/)?.[1];
    if (prefix) prefixes.add(prefix);
  }

  const fallbackName = stringValue(scenario.scenarioName) ?? stringValue(scenario.title);
  if (fallbackName) prefixes.add(`playwright/scenarios/${sanitizeArtifactFolderName(fallbackName)}/`);
  return [...prefixes];
}

function sanitizeArtifactFolderName(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "artifact"
  );
}
