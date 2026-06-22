// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { Prisma } from "@generated/prisma/client";
import type {
  ProjectActivity,
  ProjectDashboardVersionRef,
  ProjectLatestCrawlSession,
  ProjectLatestRun,
  ProjectLatestTestFlow,
} from "@models/projectDashboard";

export type DashboardVersionRow = Prisma.TargetApplicationVersionGetPayload<{
  include: { targetApplication: { select: { id: true; name: true } } };
}>;

export type DashboardLatestRunRow = Prisma.RegressionRunGetPayload<{
  include: {
    targetApplication: { select: { id: true; name: true } };
    version: { select: { id: true; version: true } };
  };
}>;

export type DashboardLatestCrawlSessionRow = Prisma.CrawlSessionGetPayload<{
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

export type DashboardLatestTestFlowRow = Prisma.TestFlowGetPayload<{
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

export function mapDashboardVersion(version: DashboardVersionRow): ProjectDashboardVersionRef {
  return {
    id: version.id,
    version: version.version,
    applicationId: version.targetApplication.id,
    applicationName: version.targetApplication.name,
  } as ProjectDashboardVersionRef;
}

export function mapLatestRun(run: DashboardLatestRunRow): ProjectLatestRun {
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
    createdAt: run.createdAt.toISOString(),
  } as ProjectLatestRun;
}

export function mapLatestCrawlSession(session: DashboardLatestCrawlSessionRow): ProjectLatestCrawlSession {
  return {
    id: session.id,
    status: toPublicStatus(session.status),
    triggerType: toPublicStatus(session.triggerType),
    applicationId: session.appVersion.targetApplication.id,
    applicationName: session.appVersion.targetApplication.name,
    versionId: session.appVersion.id,
    version: session.appVersion.version,
    stateCount: session.stateCount,
    transitionCount: session.transitionCount,
    createdAt: session.createdAt.toISOString(),
    startedAt: toIso(session.startedAt),
    finishedAt: toIso(session.finishedAt),
  } as ProjectLatestCrawlSession;
}

export function mapLatestTestFlow(flow: DashboardLatestTestFlowRow): ProjectLatestTestFlow {
  return {
    id: flow.id,
    crawlSessionId: flow.crawlSessionId,
    applicationId: flow.appVersion.targetApplication.id,
    applicationName: flow.appVersion.targetApplication.name,
    versionId: flow.appVersion.id,
    version: flow.appVersion.version,
    checkpointStateHash: flow.checkpointStateHash,
    checkpointUrl: "",
    isClipped: false,
    stepCount: flow.stepCount,
    createdAt: flow.createdAt.toISOString(),
  } as ProjectLatestTestFlow;
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
  } as ProjectActivity;
}
