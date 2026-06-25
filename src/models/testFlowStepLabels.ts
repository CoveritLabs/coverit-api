// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { TEST_FLOW_STEP_LABEL_STATUSES } from "@constants/testFlowStepLabels";

export type TestFlowStepLabelingStatus =
  (typeof TEST_FLOW_STEP_LABEL_STATUSES)[keyof typeof TEST_FLOW_STEP_LABEL_STATUSES];

export interface TestFlowStepStateLabel {
  stateHash: string;
  label: string;
  labelingStatus: TestFlowStepLabelingStatus;
}

export interface TestFlowStepLabel {
  transitionId: string;
  label: string;
  action?: string;
  labelingStatus: TestFlowStepLabelingStatus;
  fromState?: TestFlowStepStateLabel;
  toState?: TestFlowStepStateLabel;
}

export interface TestFlowStepLabelRecord {
  transitionId?: unknown;
  transitionDbId?: unknown;
  transitionName?: unknown;
  transitionAction?: unknown;
  transitionStatus?: unknown;
  fromStateHash?: unknown;
  fromStateLabel?: unknown;
  fromStateStatus?: unknown;
  toStateHash?: unknown;
  toStateLabel?: unknown;
  toStateStatus?: unknown;
}
