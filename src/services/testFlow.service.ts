// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { logger } from "@services/logger.service";

interface FlowStep {
  state_hash: string;
  transition: Record<string, unknown> | null;
}

interface SerializedFlow {
  checkpoint: string;
  is_clipped: boolean;
  path: FlowStep[];
}

export type AllFlowsPayload = Record<string, SerializedFlow[]>;

function resolveCheckpointUrl(flow: SerializedFlow): string {
  const firstAction = flow.path[1];
  return (firstAction?.transition?.checkpoint_url as string | undefined) ?? "";
}

export async function saveAllFlows(
  sessionId: string,
  payload: AllFlowsPayload,
): Promise<void> {
  const session = await prisma.crawlSession.findUniqueOrThrow({
    where: { id: sessionId },
    select: { appVersionId: true },
  });

  const stepsByFingerprint = new Map<string, {
    sourceStateHash: string;
    targetStateHash: string;
    actionType: string;
    actionFingerprint: string;
    transition: Record<string, unknown>;
  }>();

  for (const flows of Object.values(payload)) {
    for (const flow of flows) {
      for (let i = 1; i < flow.path.length; i++) {
        const step = flow.path[i];
        const prev = flow.path[i - 1];
        const t = step.transition;

        if (!t) continue;

        const fingerprint = t.action_fingerprint as string | undefined;
        if (!fingerprint || stepsByFingerprint.has(fingerprint)) continue;

        stepsByFingerprint.set(fingerprint, {
          sourceStateHash: prev.state_hash,
          targetStateHash: step.state_hash,
          actionType: (t.action_type as string) ?? "",
          actionFingerprint: fingerprint,
          transition: t,
        });
      }
    }
  }

  const stepsToInsert = Array.from(stepsByFingerprint.values()).map((s) => ({
    crawlSessionId: sessionId,
    sourceStateHash: s.sourceStateHash,
    targetStateHash: s.targetStateHash,
    actionType: s.actionType,
    actionFingerprint: s.actionFingerprint,
    transition: s.transition as any,
  }));

  if (stepsToInsert.length > 0) {
    await prisma.testFlowStep.createMany({
      data: stepsToInsert,
      skipDuplicates: true,
    });
  }

  const persistedSteps = await prisma.testFlowStep.findMany({
    where: { crawlSessionId: sessionId },
    select: { id: true, actionFingerprint: true },
  });

  const stepIdByFingerprint = new Map(
    persistedSteps.map((s) => [s.actionFingerprint, s.id]),
  );

  const allDbOperations: Array<ReturnType<typeof prisma.testFlow.create>> = [];

  for (const [targetStateHash, flows] of Object.entries(payload)) {
    if (flows.length === 0) continue;

    for (const flow of flows) {
      const compositionSteps: { stepId: string; stepOrder: number }[] = [];

      for (let i = 1; i < flow.path.length; i++) {
        const step = flow.path[i];
        const fingerprint = step.transition?.action_fingerprint as string | undefined;

        if (fingerprint) {
          const stepId = stepIdByFingerprint.get(fingerprint);
          if (stepId) {
            compositionSteps.push({
              stepId,
              stepOrder: i,
            });
          }
        }
      }

      allDbOperations.push(
        prisma.testFlow.create({
          data: {
            crawlSessionId: sessionId,
            appVersionId: session.appVersionId,
            targetStateHash,
            checkpointStateHash: flow.checkpoint,
            checkpointUrl: resolveCheckpointUrl(flow),
            isClipped: flow.is_clipped,
            stepCount: flow.path.length,
            compositions: {
              create: compositionSteps,
            },
          },
        })
      );
    }
  }

  if (allDbOperations.length > 0) {
    await prisma.$transaction(allDbOperations);
  }

  logger.info(
    `Saved flows for session ${sessionId}: ` +
    `${stepsByFingerprint.size} unique steps, ` +
    `${Object.values(payload).flat().length} total flows`,
  );
}