// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

/**
 * HTTP response message strings for the TargetApplication domain.
 */
export const TARGET_APPLICATION_MESSAGES = {
  CREATE_SUCCESS: "Target application created successfully",
  CREATE_FAILURE: "Failed to create target application",
  EXISTING_APPLICATION: "Target application with the same name already exists",

  UPDATE_SUCCESS: "Target application updated successfully",
  UPDATE_FAILURE: "Failed to update target application",
  NOT_FOUND: "Target application not found",

  DELETE_SUCCESS: "Target application deleted successfully",
  DELETE_FAILURE: "Failed to delete target application",

  // Version-specific messages
  VERSION_CREATE_SUCCESS: "Target application version created successfully",
  VERSION_EXISTS: "Target application version already exists",
  VERSION_NOT_FOUND: "Target application version not found",
  VERSION_DELETE_SUCCESS: "Target application version deleted successfully",
} as const;

/**
 * Zod schema validation error messages for the TargetApplication domain.
 */
export const TARGET_APPLICATION_VALIDATION = {
  NAME_REQUIRED: "Target application name is required",
  NAME_MIN_LENGTH: "Target application name cannot be empty",
  BASE_URL_REQUIRED: "Base URL is required",
  BASE_URL_INVALID: "Base URL must be a valid URL",
  VERSION_REQUIRED: "Version is required",
} as const;
