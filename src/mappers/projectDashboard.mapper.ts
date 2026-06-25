// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { Prisma } from "@generated/prisma/client";
import type {
  ProjectActivity,
  ProjectCrawlSessionTrendPoint,
  ProjectRunTrendPoint,
} from "@models/projectDashboard";

export type DashboardRunTrendRow = Prisma.RegressionRunGetPayload<{
  include: {
    targetApplication: { select: { id: true; name: true } };
    version: { select: { id: true; version: true } };
  };
}>;

export type DashboardCrawlSessionTrendRow = Prisma.CrawlSessionGetPayload<{
  include: {
    appVersion: {
      select: {
        id: true;
        version: true;
        targetApplication: { select: { id: true; name: true } };
      };
    };
  };
}>;

export type DashboardProjectActivityRow = Prisma.ProjectActivityGetPayload<object>;

export function toIso(value?: Date | null): string | undefined {
  return value?.toISOString?.();
}

export function toPublicStatus(status: string): string {
  return status.toLowerCase();
}

export function displayRunName(name: string, nameNumber: number): string {
  return nameNumber <= 1 ? name : `${name} #${nameNumber}`;
}

export function mapRunTrendPoint(run: DashboardRunTrendRow): ProjectRunTrendPoint {
  return {
    id: run.id,
    runId: run.runId,
    displayName: displayRunName(run.name ?? "Run", run.nameNumber ?? 1),
    status: toPublicStatus(run.status),
    applicationId: run.targetApplication.id,
    applicationName: run.targetApplication.name,
    versionId: run.version?.id,
    version: run.version?.version,
    passedCount: run.passedCount,
    warningCount: run.warningCount,
    failedCount: run.failedCount,
    durationMs: run.durationMs ?? undefined,
    createdAt: run.createdAt.toISOString(),
  };
}

export function mapCrawlSessionTrendPoint(session: DashboardCrawlSessionTrendRow): ProjectCrawlSessionTrendPoint {
  return {
    id: session.id,
    applicationId: session.appVersion.targetApplication.id,
    applicationName: session.appVersion.targetApplication.name,
    versionId: session.appVersion.id,
    version: session.appVersion.version,
    stateCount: session.stateCount,
    transitionCount: session.transitionCount,
    createdAt: session.createdAt.toISOString(),
    finishedAt: toIso(session.finishedAt),
  };
}

export function mapProjectActivity(activity: DashboardProjectActivityRow): ProjectActivity {
  return {
    id: activity.id,
    projectId: activity.projectId,
    eventType: activity.eventType,
    entityType: activity.entityType,
    entityId: activity.entityId ?? undefined,
    message: activity.message,
    actorUserId: activity.actorUserId ?? undefined,
    actorName: activity.actorName ?? undefined,
    actorEmail: activity.actorEmail ?? undefined,
    createdAt: activity.createdAt.toISOString(),
  };
}
