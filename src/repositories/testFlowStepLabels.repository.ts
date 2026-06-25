// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { TEST_FLOW_STEP_LABELS } from "@constants/testFlowStepLabels";
import { getNeo4jReadSession } from "@lib/neo4j";
import { mapTestFlowStepLabelRecord } from "@mappers/testFlowStepLabels.mapper";
import type { TestFlowStepLabel, TestFlowStepLabelRecord } from "@models/testFlowStepLabels";

type Neo4jRecordLike = {
  get(key: string): unknown;
};

type Neo4jReadResultLike = {
  records: Neo4jRecordLike[];
};

type Neo4jTransactionLike = {
  run(query: string, params?: Record<string, unknown>): Promise<Neo4jReadResultLike>;
};

const READ_TEST_FLOW_STEP_LABELS = `
UNWIND range(0, size($transitionIds) - 1) AS transitionIndex
WITH transitionIndex, $transitionIds[transitionIndex] AS requestedTransitionId
OPTIONAL MATCH (from:State {graph_id: $graphId})
      -[transition:TRANSITION {
        graph_id: $graphId,
        transition_id: requestedTransitionId
      }]->
      (to:State {graph_id: $graphId})
RETURN requestedTransitionId AS transitionId,
       elementId(transition) AS transitionDbId,
       transition.name AS transitionName,
       transition.action AS transitionAction,
       transition.labeling_status AS transitionStatus,
       from.state_hash AS fromStateHash,
       coalesce(from.name, from.label, from.title, from.url, from.state_hash) AS fromStateLabel,
       from.labeling_status AS fromStateStatus,
       to.state_hash AS toStateHash,
       coalesce(to.name, to.label, to.title, to.url, to.state_hash) AS toStateLabel,
       to.labeling_status AS toStateStatus
ORDER BY transitionIndex
`;

function recordValue(record: Neo4jRecordLike, key: keyof TestFlowStepLabelRecord): unknown {
  return record.get(key);
}

function toLabelRecord(record: Neo4jRecordLike): TestFlowStepLabelRecord {
  return {
    transitionId: recordValue(record, "transitionId"),
    transitionDbId: recordValue(record, "transitionDbId"),
    transitionName: recordValue(record, "transitionName"),
    transitionAction: recordValue(record, "transitionAction"),
    transitionStatus: recordValue(record, "transitionStatus"),
    fromStateHash: recordValue(record, "fromStateHash"),
    fromStateLabel: recordValue(record, "fromStateLabel"),
    fromStateStatus: recordValue(record, "fromStateStatus"),
    toStateHash: recordValue(record, "toStateHash"),
    toStateLabel: recordValue(record, "toStateLabel"),
    toStateStatus: recordValue(record, "toStateStatus"),
  };
}

export async function getTestFlowStepLabels(graphId: string, transitionIds: string[]): Promise<TestFlowStepLabel[]> {
  if (transitionIds.length === 0) return [];

  const session = getNeo4jReadSession();
  try {
    const result: Neo4jReadResultLike = await session.executeRead((tx: Neo4jTransactionLike) =>
      tx.run(READ_TEST_FLOW_STEP_LABELS, {
        graphId,
        transitionIds,
      }),
    );

    return result.records.flatMap((record, index) => {
      const label = mapTestFlowStepLabelRecord(
        toLabelRecord(record),
        TEST_FLOW_STEP_LABELS.fallbackTransitionLabel(index + 1),
      );
      return label ? [label] : [];
    });
  } finally {
    await session.close();
  }
}
