// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import type { Prisma } from "@generated/prisma/client";
import { logger } from "@services/logger.service";

export type ProjectActivityInput = {
  projectId: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

type ActorSnapshot = {
  id: string;
  name: string;
  email: string;
};

async function getActorSnapshot(actorUserId?: string): Promise<ActorSnapshot | null> {
  if (!actorUserId) return null;

  return prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, name: true, email: true },
  });
}

export async function recordProjectActivities(events: ProjectActivityInput[], actorUserId?: string): Promise<void> {
  if (events.length === 0) return;

  try {
    const actor = await getActorSnapshot(actorUserId);
    await prisma.projectActivity.createMany({
      data: events.map((event) => ({
        projectId: event.projectId,
        actorUserId: actor?.id,
        actorName: actor?.name,
        actorEmail: actor?.email,
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        message: event.message,
        metadata: event.metadata,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ module: "projectActivity", error: message }, "Failed to record project activities");
  }
}
