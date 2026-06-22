// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export const MANUAL_SESSION_MESSAGES = {
  INVALID_TICKET: "Manual session ticket is invalid or expired",
  INVALID_TICKET_SESSION_ID: "Manual session ticket does not match the session ID",
  SESSION_NOT_FOUND: "Manual session not found",
  SESSION_NOT_MANUAL: "Session is not a manual recording",
  SESSION_NOT_ACTIVE: "Manual session is no longer active",
} as const;
