// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export const CRAWL_SESSION_MESSAGES = {
  NOT_FOUND: "Crawl session not found",
  VERSION_NOT_FOUND: "Target application version not found",
  APPLICATION_NOT_FOUND: "Target application not found",
  CODEBASE_NOT_FOUND: "Regression codebase not found",
  CREATE_SUCCESS: "Crawl session created successfully",
  DELETE_SUCCESS: "Crawl session deleted successfully",
  ABORTED_DELETE_SUCCESS: "Crawl session aborted and deleted successfully",
  STARTED: "Crawl session started successfully",
  ALREADY_STARTED: "Crawl session already started",
  PAUSED: "Crawl session paused successfully",
  ALREADY_PAUSED: "Crawl session already paused",
  RESUMED: "Crawl session resumed successfully",
  ABORTED: "Crawl session aborted successfully",
  ALREADY_ABORTED: "Crawl session already aborted",
  INVALID_STATUS: "Crawl session status does not allow this action",
  MANUAL_TRIGGER_NOT_ALLOWED: "Manual sessions are not allowed for automated crawl sessions",
} as const;
