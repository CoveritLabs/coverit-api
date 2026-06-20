// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type {
  RegressionArtifactKind,
  RegressionArtifactResponse,
  RegressionArtifactTreeNodeResponse,
  RegressionArtifactUploadStatus,
  RegressionEventResponse,
  RegressionRunResponse,
  RegressionRunStatus,
  RegressionScenarioResponse,
  RegressionScenarioStatus,
} from "@models/regressionRun";

export type DbRegressionRunStatus = "RUNNING" | "PASSED" | "FAILED";
export type DbRegressionScenarioStatus = "RUNNING" | "PASSED" | "FAILED";
export type DbRegressionArtifactKind = "FAILURE" | "LOG" | "HEALING" | "SUMMARY" | "SCREENSHOT" | "VIDEO" | "TRACE" | "EVENTS" | "OTHER";
export type DbRegressionArtifactUploadStatus = "UPLOADED" | "FAILED";

export function mapRegressionRun(run: any): RegressionRunResponse {
  return {
    id: run.id,
    runId: run.runId,
    applicationId: run.targetApplicationId,
    versionId: run.versionId ?? undefined,
    name: run.name ?? "Run",
    nameNumber: run.nameNumber ?? 1,
    displayName: displayRunName(run.name ?? "Run", run.nameNumber ?? 1),
    status: toPublicStatus<RegressionRunStatus>(run.status),
    startedAt: run.startedAt?.toISOString?.() ?? undefined,
    finishedAt: run.finishedAt?.toISOString?.() ?? undefined,
    durationMs: run.durationMs ?? undefined,
    passedCount: run.passedCount,
    failedCount: run.failedCount,
    warningCount: run.warningCount,
    summary: run.summary ?? undefined,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

function displayRunName(name: string, nameNumber: number): string {
  return nameNumber <= 1 ? name : `${name} #${nameNumber}`;
}

export function mapRegressionScenario(scenario: any): RegressionScenarioResponse {
  return {
    id: scenario.id,
    runId: scenario.runDbId,
    scenarioKey: scenario.scenarioKey,
    featureName: scenario.featureName ?? undefined,
    scenarioName: scenario.scenarioName ?? undefined,
    title: scenario.title ?? undefined,
    file: scenario.file ?? undefined,
    line: scenario.line ?? undefined,
    status: toPublicStatus<RegressionScenarioStatus>(scenario.status),
    startedAt: scenario.startedAt?.toISOString?.() ?? undefined,
    finishedAt: scenario.finishedAt?.toISOString?.() ?? undefined,
    durationMs: scenario.durationMs ?? undefined,
    passedCount: scenario.passedCount,
    failedCount: scenario.failedCount,
    warningCount: scenario.warningCount,
  };
}

export function mapRegressionEvent(event: any): RegressionEventResponse {
  return {
    id: event.id,
    runId: event.runDbId,
    scenarioId: event.scenarioId ?? undefined,
    type: event.type,
    timestamp: event.timestamp.toISOString(),
    featureName: event.featureName ?? undefined,
    scenarioName: event.scenarioName ?? undefined,
    stepId: event.stepId ?? undefined,
    stepLabel: event.stepLabel ?? undefined,
    stepType: event.stepType ?? undefined,
    status: event.status ?? undefined,
    logLevel: event.logLevel ?? undefined,
    hasFailure: event.hasFailure,
    hasHealing: event.hasHealing,
    payload: event.payload,
  };
}

export function mapRegressionArtifact(artifact: any): RegressionArtifactResponse {
  return {
    id: artifact.id,
    runId: artifact.runDbId,
    scenarioId: artifact.scenarioId ?? undefined,
    kind: toPublicStatus<RegressionArtifactKind>(artifact.kind),
    name: artifact.name,
    data: artifact.data,
    contentType: artifact.contentType ?? undefined,
    sizeBytes: artifact.sizeBytes == null ? undefined : Number(artifact.sizeBytes),
    storageProvider: artifact.storageProvider ?? undefined,
    storageUri: artifact.storageUri ?? undefined,
    storagePath: artifact.storagePath ?? undefined,
    checksumSha256: artifact.checksumSha256 ?? undefined,
    uploadStatus: artifact.uploadStatus == null ? undefined : toPublicStatus<RegressionArtifactUploadStatus>(artifact.uploadStatus),
    uploadError: artifact.uploadError ?? undefined,
    metadata: artifact.metadata ?? undefined,
    createdAt: artifact.createdAt.toISOString(),
    updatedAt: artifact.updatedAt?.toISOString?.() ?? undefined,
  };
}

export function buildRegressionArtifactTree(artifacts: RegressionArtifactResponse[]): RegressionArtifactTreeNodeResponse[] {
  const roots: RegressionArtifactTreeNodeResponse[] = [];
  const folders = new Map<string, RegressionArtifactTreeNodeResponse & { children: RegressionArtifactTreeNodeResponse[] }>();

  for (const artifact of artifacts) {
    const parts = getArtifactPathParts(artifact);
    const fileName = parts[parts.length - 1] ?? artifact.name;
    const folderParts = parts.slice(0, -1);
    let children = roots;
    let currentPath = "";

    for (const folderName of folderParts) {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      let folder = folders.get(currentPath);
      if (!folder) {
        folder = {
          id: `folder:${currentPath}`,
          name: folderName,
          path: currentPath,
          type: "folder",
          children: [],
          artifactCount: 0,
        };
        folders.set(currentPath, folder);
        children.push(folder);
      }
      children = folder.children;
    }

    const filePath = folderParts.length > 0 ? `${folderParts.join("/")}/${fileName}` : fileName;
    children.push({
      id: `artifact:${artifact.id}`,
      name: fileName,
      path: filePath,
      type: "file",
      artifact,
      artifactCount: 1,
      sizeBytes: artifact.sizeBytes,
    });
  }

  return roots.map(finalizeArtifactTreeNode).sort(compareArtifactTreeNodes);
}

function finalizeArtifactTreeNode(node: RegressionArtifactTreeNodeResponse): RegressionArtifactTreeNodeResponse {
  if (node.type === "file") return node;

  const children = (node.children ?? []).map(finalizeArtifactTreeNode).sort(compareArtifactTreeNodes);
  const artifactCount = children.reduce((total, child) => total + child.artifactCount, 0);
  const sizeBytes = children.reduce((total, child) => total + (child.sizeBytes ?? 0), 0);

  return {
    ...node,
    children,
    artifactCount,
    sizeBytes: sizeBytes > 0 ? sizeBytes : undefined,
  };
}

function compareArtifactTreeNodes(a: RegressionArtifactTreeNodeResponse, b: RegressionArtifactTreeNodeResponse): number {
  if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
}

function getArtifactPathParts(artifact: RegressionArtifactResponse): string[] {
  const metadata = asRecord(artifact.metadata);
  const relativePath = stringValue(metadata.relativePath) ?? artifact.name;
  const parts = relativePath
    .replace(/\\/g, "/")
    .split("/")
    .map((part: string) => part.trim())
    .filter((part: string) => part.length > 0 && part !== "." && part !== "..");

  return parts.length > 0 ? parts : [artifact.name];
}

function toPublicStatus<T extends string>(status: string): T {
  return status.toLowerCase() as T;
}

export function toDbRunStatus(status: string): DbRegressionRunStatus {
  return status.toUpperCase() === "PASSED" ? "PASSED" : status.toUpperCase() === "FAILED" ? "FAILED" : "RUNNING";
}

export function toDbScenarioStatus(status: string): DbRegressionScenarioStatus {
  return status.toUpperCase() === "PASSED" ? "PASSED" : status.toUpperCase() === "FAILED" ? "FAILED" : "RUNNING";
}

export function toDbArtifactKind(kind: string): DbRegressionArtifactKind {
  const normalized = kind.toUpperCase();
  const allowedKinds = ["FAILURE", "LOG", "HEALING", "SUMMARY", "SCREENSHOT", "VIDEO", "TRACE", "EVENTS", "OTHER"] as const;
  return allowedKinds.includes(normalized as DbRegressionArtifactKind) ? normalized as DbRegressionArtifactKind : "OTHER";
}

export function toDbUploadStatus(status: string): DbRegressionArtifactUploadStatus {
  return status.toUpperCase() === "FAILED" ? "FAILED" : "UPLOADED";
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
