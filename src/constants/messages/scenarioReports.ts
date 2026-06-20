// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export const SCENARIO_REPORT_MESSAGES = {
  UNSUPPORTED_PROVIDER: "Unsupported scenario report provider",
  REPORTING_NOT_CONFIGURED: "Integration reporting is not configured",
  SCENARIO_NOT_REPORTABLE: "Only failed or warning scenarios can be reported",
  REPORT_ALREADY_CREATED: "Scenario already has an integration report for this provider",
  REPORT_NOT_FOUND: "Scenario integration report not found",
  ARTIFACTS_NOT_FOUND: "One or more selected artifacts are not available for this scenario",
  INTERNAL_TOKEN_REQUIRED: "Internal service token is required",
  INTERNAL_TOKEN_INVALID: "Internal service token is invalid",
  REPORT_CREATED: "Scenario integration report queued",
} as const;

export const SCENARIO_REPORT_VALIDATION = {
  TITLE_REQUIRED: "title is required",
  DESCRIPTION_REQUIRED: "description is required",
  ARTIFACT_IDS_REQUIRED: "artifactIds must be an array",
  STATUS_INVALID: "status is invalid",
} as const;
