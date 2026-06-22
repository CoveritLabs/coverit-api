// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

/**
 * HTTP response message strings for the User domain.
 */
export const USER_MESSAGES = {
  NOT_FOUND: "User not found",
  UPDATE_SUCCESS: "User updated successfully",
  UPDATE_FAILURE: "Failed to update user",
  DELETE_SUCCESS: "User deleted successfully",
  DELETE_FAILURE: "Failed to delete user",
  EMAIL_IN_USE: "Email is already in use",
} as const;
