// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export const ARTIFACT_STORAGE = {
  DEFAULT_CONTENT_TYPE: "application/octet-stream",
  DEFAULT_ARTIFACT_NAME: "artifact",
  DEFAULT_PREFIX: "coverit-regression-artifacts",
  RUN_SCENARIO_SEGMENT: "run",
  DAGSHUB_PROVIDER: "dagshub-storage",
  DAGSHUB_FAILED_PROVIDER: "dagshub",
  DAGSHUB_REGION: "us-east-1",
} as const;

export const ARTIFACT_STORAGE_MESSAGES = {
  DAGSHUB_NOT_CONFIGURED: "DagsHub artifact storage is not configured",
  DAGSHUB_UPLOAD_FAILED: "DagsHub Storage upload failed",
  DAGSHUB_READ_FAILED: "DagsHub Storage read failed",
  METADATA_INVALID: "artifact metadata must be valid JSON",
  MULTIPART_FILE_REQUIRED: "multipart artifact file is required",
} as const;
