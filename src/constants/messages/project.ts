// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

/**
 * HTTP response message strings for the Project domain.
 */
export const PROJECT_MESSAGES = {
  // auth and permissions
  AUTH_REQUIRED: "Authentication required",
  MEMBER_REQUIRED: "You are not a member of this project",
  ADMIN_REQUIRED: "Only project admins can perform this action",

  // create project
  CREATE_SUCCESS: "Project created successfully",
  CREATE_FAILURE: "Failed to create project",
  EXISTING_PROJECT: "Project with the same name already exists",

  // update project
  UPDATE_SUCCESS: "Project updated successfully",
  UPDATE_FAILURE: "Failed to update project",
  NOT_FOUND: "Project not found",

  // delete project
  DELETE_SUCCESS: "Project deleted successfully",
  DELETE_FAILURE: "Failed to delete project",

  // add members
  ADD_MEMBERS_SUCCESS: "Members added successfully",
  ADD_MEMBERS_FAILURE: "Failed to add members",
  ADD_MEMBERS_INVALID_USER: "One or more user emails are invalid",
  MEMBERS_NOT_FOUND: "The following emails were not found",

  // remove members
  REMOVE_MEMBERS_SUCCESS: "Members removed successfully",
  REMOVE_MEMBERS_FAILURE: "Failed to remove members",
  REMOVE_MEMBERS_INVALID_USER: "One or more user emails are invalid",
} as const;

/**
 * Zod schema validation error messages for the Project domain.
 */
export const PROJECT_VALIDATION = {
  NAME_REQUIRED: "Project name is required",
  NAME_MIN_LENGTH: "Project name cannot be empty",
  DESCRIPTION_MAX_LENGTH: "Project description must be at most 200 characters",
  MEMBERS_INVALID_USER: "Each user email must be a valid email address",
  MEMBERS_MIN_ITEMS: "At least one email is required",
} as const;
