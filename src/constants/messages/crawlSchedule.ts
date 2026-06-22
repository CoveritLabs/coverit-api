// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export const CRAWL_SCHEDULE_MESSAGES = {
  NOT_FOUND: "Crawl schedule not found",
  CREATE_SUCCESS: "Crawl schedule created successfully",
  UPDATE_SUCCESS: "Crawl schedule updated successfully",
  DELETE_SUCCESS: "Crawl schedule deleted successfully",
  INVALID_SCHEDULE: "Crawl schedule configuration is invalid",
  VERSION_REQUIRED: "Fixed-version schedules require versionId",
  CRON_REQUIRED: "Cron schedules require a cron expression",
  RUN_AT_REQUIRED: "One-time schedules require runAt",
} as const;

export const CRAWL_SCHEDULE_VALIDATION = {
  ONE_TIME_SCHEDULE_RUN_AT_REQUIRED: "runAt is required for one-time schedules",
  CRON_SCHEDULE_CRON_REQUIRED: "cron is required for cron schedules",
  FIXED_VERSION_SCHEDULE_VERSION_ID_REQUIRED: "versionId is required for fixed-version schedules",
} as const;
