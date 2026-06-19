// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { env } from "@config/env";
import { ARTIFACT_STORAGE, ARTIFACT_STORAGE_MESSAGES } from "@constants/artifactStorage";
import { REGRESSION_RUN_MESSAGES } from "@constants/messages";
import { BadRequestError } from "@utils/errors";

export function parseArtifactMetadata(metadata?: string): Record<string, any> {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata);
    return asRecord(parsed);
  } catch {
    throw new BadRequestError(ARTIFACT_STORAGE_MESSAGES.METADATA_INVALID);
  }
}

export function buildArtifactStoragePath(applicationId: string, runId: string, scenarioKey: string | undefined, relativePath: string): string {
  const safeRelativePath = sanitizeRelativeArtifactPath(relativePath);
  const scenarioSegment = scenarioKey ? sanitizeArtifactPathSegment(scenarioKey) : ARTIFACT_STORAGE.RUN_SCENARIO_SEGMENT;
  return [
    buildApplicationArtifactStoragePrefix(applicationId),
    sanitizeArtifactPathSegment(runId),
    scenarioSegment,
    safeRelativePath,
  ].join("/");
}

export function buildApplicationArtifactStoragePrefix(applicationId: string): string {
  return [
    sanitizeRelativeArtifactPath(env.DAGSHUB_ARTIFACT_PREFIX ?? ARTIFACT_STORAGE.DEFAULT_PREFIX),
    sanitizeArtifactPathSegment(applicationId),
  ].join("/");
}

export function sanitizeRelativeArtifactPath(value: string): string {
  const cleaned = value.replace(/\\/g, "/").split("/").filter(Boolean);
  if (cleaned.length === 0 || cleaned.some((part) => part === "." || part === "..")) {
    throw new BadRequestError(REGRESSION_RUN_MESSAGES.ARTIFACT_PATH_INVALID);
  }
  return cleaned.map(sanitizeArtifactPathSegment).join("/");
}

export function sanitizeArtifactPathSegment(value: string): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || ARTIFACT_STORAGE.DEFAULT_ARTIFACT_NAME;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}
