// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { logger } from "@services/logger.service";

interface SerializedFlow {
  checkpoint: string;
  transition_refs: string[];
}

export type AllFlowsPayload = Record<string, SerializedFlow[]>;

export async function saveAllFlows(
  sessionId: string,
  payload: AllFlowsPayload,
): Promise<void> {
  const session = await prisma.crawlSession.findUniqueOrThrow({
    where: { id: sessionId },
    select: { appVersionId: true },
  });

  const flowsToInsert = Object.entries(payload).flatMap(([targetStateHash, flows]) => {
    return flows.map((flow) => ({
      crawlSessionId: sessionId,
      appVersionId: session.appVersionId,
      targetStateHash,
      checkpointStateHash: flow.checkpoint,
      transitionRefs: flow.transition_refs,
      stepCount: flow.transition_refs.length,
    }));
  });

  if (flowsToInsert.length === 0) {
    logger.info(`No flows to save for session ${sessionId}`);
    return;
  }

  await prisma.testFlow.createMany({
    data: flowsToInsert,
  });

  logger.info(
    `Saved flows for session ${sessionId}: ${flowsToInsert.length} total flows saved in bulk.`,
  );
}