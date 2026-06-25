// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export const TEST_FLOW_STEP_LABEL_STATUSES = {
  COMPLETED: "COMPLETED",
  PENDING: "PENDING",
  QUEUED: "QUEUED",
  MISSING: "MISSING",
} as const;

export const TEST_FLOW_STEP_LABELS = {
  CACHE_TTL_SECONDS: 30,
  fallbackTransitionLabel: (index: number): string => `Transition ${index}`,
} as const;
