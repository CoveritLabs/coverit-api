// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export const REGRESSION_RUN_MESSAGES = {
  API_KEY_REQUIRED: "Regression API key is required",
  API_KEY_INVALID: "Regression API key is invalid",
  APPLICATION_REQUIRED: "applicationId is required",
  APPLICATION_MISMATCH: "API key does not match applicationId",
  VERSION_NOT_FOUND: "Target application version not found",
  RUN_NOT_FOUND: "Regression run not found",
  SCENARIO_NOT_FOUND: "Regression scenario not found",
  EVENT_STORED: "Regression event stored",
  EVENTS_STORED: "Regression events stored",
  RUN_COMPLETED: "Regression run completed",
  ARTIFACT_STORED: "Regression artifact stored",
  ARTIFACT_NOT_FOUND: "Regression artifact not found",
  ARTIFACT_FILE_REQUIRED: "Regression artifact file is required",
  ARTIFACT_PATH_INVALID: "Regression artifact path is invalid",
} as const;

export const REGRESSION_RUN_VALIDATION = {
  RUN_ID_REQUIRED: "runId is required",
  APPLICATION_ID_REQUIRED: "applicationId is required",
  EVENT_ID_REQUIRED: "event id is required",
  EVENT_TYPE_REQUIRED: "event type is required",
  ARTIFACT_NAME_REQUIRED: "artifact name is required",
  ARTIFACT_PATH_REQUIRED: "artifact relativePath is required",
  TIMESTAMP_INVALID: "timestamp must be an ISO date string",
} as const;
