// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

/**
 * HTTP response message strings for the RegressionCodebase domain.
 */
export const REGRESSION_CODEBASE_MESSAGES = {
  CREATE_SUCCESS: "Regression codebase created successfully",
  CREATE_FAILURE: "Failed to create regression codebase",
  EXISTING_REPOSITORY: "A regression codebase with the same repository URL already exists",

  UPDATE_SUCCESS: "Regression codebase updated successfully",
  UPDATE_FAILURE: "Failed to update regression codebase",
  NOT_FOUND: "Regression codebase not found",

  DELETE_SUCCESS: "Regression codebase deleted successfully",
  DELETE_FAILURE: "Failed to delete regression codebase",
} as const;

/**
 * Zod schema validation error messages for the RegressionCodebase domain.
 */
export const REGRESSION_CODEBASE_VALIDATION = {
  FRAMEWORK_NAME_REQUIRED: "Framework name is required",
  FRAMEWORK_NAME_MIN_LENGTH: "Framework name cannot be empty",
  REPOSITORY_URL_REQUIRED: "Repository URL is required",
  REPOSITORY_URL_INVALID: "Repository URL must be a valid URL",
  API_KEY_INVALID: "API key must be a non-empty string",
} as const;
