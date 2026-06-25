// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { mapTestFlowStepLabelRecord } from "@mappers/testFlowStepLabels.mapper";

describe("testFlowStepLabels.mapper", () => {
  test("uses completed Neo4j labels and state metadata", () => {
    expect(
      mapTestFlowStepLabelRecord(
        {
          transitionId: "transition-1",
          transitionDbId: "db-transition-1",
          transitionName: "Open Cart",
          transitionAction: "Click cart link",
          transitionStatus: "COMPLETED",
          fromStateHash: "state-1",
          fromStateLabel: "Home",
          fromStateStatus: "COMPLETED",
          toStateHash: "state-2",
          toStateLabel: "Cart",
          toStateStatus: "COMPLETED",
        },
        "Transition 1",
      ),
    ).toEqual({
      transitionId: "transition-1",
      label: "Open Cart",
      action: "Click cart link",
      labelingStatus: "COMPLETED",
      fromState: { stateHash: "state-1", label: "Home", labelingStatus: "COMPLETED" },
      toState: { stateHash: "state-2", label: "Cart", labelingStatus: "COMPLETED" },
    });
  });

  test("falls back while transition labels are pending", () => {
    expect(
      mapTestFlowStepLabelRecord(
        {
          transitionId: "transition-1",
          transitionDbId: "db-transition-1",
          transitionName: "Should not show yet",
          transitionStatus: "PENDING",
        },
        "Transition 1",
      ),
    ).toEqual({
      transitionId: "transition-1",
      label: "Transition 1",
      labelingStatus: "PENDING",
      fromState: undefined,
      toState: undefined,
    });
  });

  test("marks unresolved transitions as missing", () => {
    expect(
      mapTestFlowStepLabelRecord(
        {
          transitionId: "transition-1",
          transitionDbId: null,
        },
        "Transition 1",
      ),
    ).toEqual({
      transitionId: "transition-1",
      label: "Transition 1",
      labelingStatus: "MISSING",
      fromState: undefined,
      toState: undefined,
    });
  });
});
