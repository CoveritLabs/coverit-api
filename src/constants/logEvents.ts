// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

/**
 * Structured log event codes for infrastructure and cache operations.
 */
export const LOG_EVENTS = {
  CACHE_GET_FAILED: "cache.get_failed",
  CACHE_SET_FAILED: "cache.set_failed",
  CACHE_DELETE_FAILED: "cache.delete_failed",
  CACHE_SCAN_FAILED: "cache.scan_failed",
  CACHE_INVALIDATION_FAILED: "cache.invalidation_failed",
} as const;

/**
 * Canonical context messages for cache operations.
 */
export const CACHE_LOG_CONTEXTS = {
  OPERATION_FAILED: "Cache operation failed",

  // Auth service cache contexts
  AUTH_WRITE_REFRESH_TOKEN: "Failed to write refresh token cache",
  AUTH_SCAN_REFRESH_TOKEN: "Failed to scan refresh token cache",
  AUTH_DELETE_ROTATED_REFRESH_TOKEN: "Failed to delete rotated refresh token cache",
  AUTH_WRITE_NEW_REFRESH_TOKEN: "Failed to write new refresh token cache",
  AUTH_DELETE_REFRESH_TOKEN: "Failed to delete refresh token cache",
  AUTH_WRITE_RESET_TOKEN: "Failed to write reset token cache",
  AUTH_READ_RESET_TOKEN: "Failed to read reset token cache",
  AUTH_DELETE_RESET_TOKEN: "Failed to delete reset token cache",
  AUTH_SCAN_USER_REFRESH_TOKENS: "Failed to scan user refresh tokens cache",
  AUTH_DELETE_USER_REFRESH_TOKENS: "Failed to delete user refresh tokens cache",
  AUTH_WRITE_OAUTH_REFRESH_TOKEN: "Failed to write oauth refresh token cache",

  // Project service cache contexts
  PROJECT_INVALIDATE_USER_PROJECTS: "Failed to invalidate user projects cache",
  PROJECT_INVALIDATE_PROJECT: "Failed to invalidate project cache",
  PROJECT_READ_PROJECTS: "Failed to read projects cache",
  PROJECT_WRITE_PROJECTS: "Failed to write projects cache",
  PROJECT_READ_PROJECT: "Failed to read project cache",
  PROJECT_WRITE_PROJECT: "Failed to write project cache",
  PROJECT_INVALIDATE_PROJECT_ADD_MEMBERS: "Failed to invalidate project cache after adding members",
  PROJECT_INVALIDATE_USER_PROJECTS_ADD_MEMBERS: "Failed to invalidate user projects cache after adding members",
  PROJECT_INVALIDATE_PROJECT_REMOVE_MEMBERS: "Failed to invalidate project cache after removing members",
  PROJECT_INVALIDATE_USER_PROJECTS_REMOVE_MEMBERS: "Failed to invalidate user projects cache after removing members",

  // User service cache contexts
  USER_READ: "Failed to read user cache",
  USER_WRITE_BY_ID: "Failed to write user id cache",
  USER_WRITE_BY_EMAIL: "Failed to write user email cache",
  USER_INVALIDATE: "Failed to invalidate user cache",
  USER_READ_BY_EMAIL: "Failed to read user-by-email cache",
  USER_WRITE_BY_EMAIL_BATCH: "Failed to write user-by-email cache",
  USER_WRITE_BY_ID_BATCH: "Failed to write user-by-id cache",

  // Regression codebase service cache contexts
  REGRESSION_INVALIDATE: "Failed to invalidate regression codebase cache",
  REGRESSION_READ_LIST: "Failed to read regression codebase list cache",
  REGRESSION_WRITE_LIST: "Failed to write regression codebase list cache",
  REGRESSION_READ: "Failed to read regression codebase cache",
  REGRESSION_WRITE: "Failed to write regression codebase cache",
} as const;
