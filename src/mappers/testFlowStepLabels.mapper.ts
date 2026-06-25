// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { TEST_FLOW_STEP_LABEL_STATUSES } from "@constants/testFlowStepLabels";
import type {
  TestFlowStepLabel,
  TestFlowStepLabelRecord,
  TestFlowStepLabelingStatus,
  TestFlowStepStateLabel,
} from "@models/testFlowStepLabels";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeStatus(value: unknown, missing = false): TestFlowStepLabelingStatus {
  if (missing) return TEST_FLOW_STEP_LABEL_STATUSES.MISSING;
  const normalized = stringValue(value)?.toUpperCase();
  if (normalized === TEST_FLOW_STEP_LABEL_STATUSES.COMPLETED) return TEST_FLOW_STEP_LABEL_STATUSES.COMPLETED;
  if (normalized === TEST_FLOW_STEP_LABEL_STATUSES.QUEUED) return TEST_FLOW_STEP_LABEL_STATUSES.QUEUED;
  return TEST_FLOW_STEP_LABEL_STATUSES.PENDING;
}

function mapStateLabel(
  stateHash: unknown,
  label: unknown,
  status: unknown,
): TestFlowStepStateLabel | undefined {
  const hash = stringValue(stateHash);
  if (!hash) return undefined;

  return {
    stateHash: hash,
    label: stringValue(label) ?? hash.slice(0, 12),
    labelingStatus: normalizeStatus(status),
  };
}

export function mapTestFlowStepLabelRecord(
  record: TestFlowStepLabelRecord,
  fallbackLabel: string,
): TestFlowStepLabel | null {
  const transitionId = stringValue(record.transitionId);
  if (!transitionId) return null;

  const missing = !stringValue(record.transitionDbId);
  const labelingStatus = normalizeStatus(record.transitionStatus, missing);
  const completed = labelingStatus === TEST_FLOW_STEP_LABEL_STATUSES.COMPLETED;
  const transitionName = completed ? stringValue(record.transitionName) : undefined;
  const action = completed ? stringValue(record.transitionAction) : undefined;

  return {
    transitionId,
    label: transitionName ?? fallbackLabel,
    ...(action ? { action } : {}),
    labelingStatus,
    fromState: mapStateLabel(record.fromStateHash, record.fromStateLabel, record.fromStateStatus),
    toState: mapStateLabel(record.toStateHash, record.toStateLabel, record.toStateStatus),
  };
}
