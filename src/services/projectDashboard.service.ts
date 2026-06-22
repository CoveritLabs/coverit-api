// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { TARGET_APPLICATION_MESSAGES } from "@constants/messages";
import { NotFoundError } from "@utils/errors";
import type {
  ProjectActivity,
  ProjectCoverageSummary,
  ProjectDashboardResponse,
  ProjectDashboardVersionRef,
  ProjectLatestCrawlSession,
  ProjectLatestRun,
  ProjectLatestTestFlow,
  ProjectRunStatistics,
} from "@models/projectDashboard";

const LATEST_LIMIT = 5;
const ACTIVITY_LIMIT = 10;

type VersionWithApplication = {
  id: string;
  version: string;
  createdAt: Date;
  targetApplicationId: string;
  targetApplication: {
    id: string;
    name: string;
  };
};

type LatestCrawlSessionRow = {
  id: string;
  status: string;
  triggerType: string;
  stateCount: number;
  transitionCount: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  appVersion: {
    id: string;
    version: string;
    targetApplication: {
      id: string;
      name: string;
    };
  };
};

type LatestTestFlowRow = {
  id: string;
  crawlSessionId: string;
  checkpointStateHash: string;
  checkpointUrl: string;
  isClipped: boolean;
  stepCount: number;
  createdAt: Date;
  appVersion: {
    id: string;
    version: string;
    targetApplication: {
      id: string;
      name: string;
    };
  };
};

function toIso(value?: Date | null): string | undefined {
  return value?.toISOString?.();
}

function toPublicStatus(status: string): string {
  return status.toLowerCase();
}

function displayRunName(name: string, nameNumber: number): string {
  return nameNumber <= 1 ? name : `${name} #${nameNumber}`;
}

function sumValue(value?: number | null): number {
  return value ?? 0;
}

function mapVersion(version: VersionWithApplication): ProjectDashboardVersionRef {
  return {
    id: version.id,
    version: version.version,
    applicationId: version.targetApplication.id,
    applicationName: version.targetApplication.name,
  };
}

async function resolveVersion(projectId: string, versionId?: string): Promise<VersionWithApplication | null> {
  const where = versionId
    ? { id: versionId, targetApplication: { projectId } }
    : { targetApplication: { projectId } };

  const version = await prisma.targetApplicationVersion.findFirst({
    where,
    include: { targetApplication: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (versionId && !version) {
    throw new NotFoundError(TARGET_APPLICATION_MESSAGES.VERSION_NOT_FOUND);
  }

  return version;
}

async function getCoverage(version: VersionWithApplication | null): Promise<ProjectCoverageSummary> {
  if (!version) {
    return { percentage: 0, coveredTransitions: 0, totalTransitions: 0 };
  }

  const session = await prisma.crawlSession.findFirst({
    where: { appVersionId: version.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, transitionCount: true, createdAt: true },
  });

  if (!session || session.transitionCount <= 0) {
    return {
      percentage: 0,
      coveredTransitions: 0,
      totalTransitions: session?.transitionCount ?? 0,
      crawlSessionId: session?.id,
      calculatedAt: toIso(session?.createdAt),
    };
  }

  const coveredSteps = await prisma.testFlowStep.findMany({
    where: { crawlSessionId: session.id },
    distinct: ["actionFingerprint"],
    select: { actionFingerprint: true },
  });
  const coveredTransitions = coveredSteps.length;
  const percentage = Math.min(100, Math.round((coveredTransitions / session.transitionCount) * 10000) / 100);

  return {
    percentage,
    coveredTransitions,
    totalTransitions: session.transitionCount,
    crawlSessionId: session.id,
    calculatedAt: session.createdAt.toISOString(),
  };
}

async function getRunStatistics(projectId: string): Promise<ProjectRunStatistics> {
  const [totals, reportedWarningCount, reportedFailedCount] = await Promise.all([
    prisma.regressionRun.aggregate({
      where: { targetApplication: { projectId } },
      _count: { _all: true },
      _sum: { passedCount: true, warningCount: true, failedCount: true },
    }),
    prisma.scenarioIntegrationReport.count({
      where: { projectId, scenario: { warningCount: { gt: 0 } } },
    }),
    prisma.scenarioIntegrationReport.count({
      where: { projectId, scenario: { failedCount: { gt: 0 } } },
    }),
  ]);

  return {
    passedCount: sumValue(totals._sum?.passedCount),
    warningCount: sumValue(totals._sum?.warningCount),
    failedCount: sumValue(totals._sum?.failedCount),
    reportedWarningCount,
    reportedFailedCount,
    totalRuns: totals._count?._all ?? 0,
  };
}

async function getLatestRuns(projectId: string): Promise<ProjectLatestRun[]> {
  const rows = await prisma.regressionRun.findMany({
    where: { targetApplication: { projectId } },
    orderBy: { createdAt: "desc" },
    take: LATEST_LIMIT,
    include: {
      targetApplication: { select: { id: true, name: true } },
      version: { select: { id: true, version: true } },
    },
  });

  return rows.map((run) => ({
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
  }));
}

async function getLatestCrawlSessions(projectId: string): Promise<ProjectLatestCrawlSession[]> {
  const rows: LatestCrawlSessionRow[] = await prisma.crawlSession.findMany({
    where: { appVersion: { targetApplication: { projectId } } },
    orderBy: { createdAt: "desc" },
    take: LATEST_LIMIT,
    include: {
      appVersion: {
        select: {
          id: true,
          version: true,
          targetApplication: { select: { id: true, name: true } },
        },
      },
    },
  });

  return rows.map((session) => ({
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
  }));
}

async function getLatestTestFlows(projectId: string): Promise<ProjectLatestTestFlow[]> {
  const rows: LatestTestFlowRow[] = await prisma.testFlow.findMany({
    where: { appVersion: { targetApplication: { projectId } } },
    orderBy: { createdAt: "desc" },
    take: LATEST_LIMIT,
    include: {
      appVersion: {
        select: {
          id: true,
          version: true,
          targetApplication: { select: { id: true, name: true } },
        },
      },
    },
  });

  return rows.map((flow) => ({
    id: flow.id,
    crawlSessionId: flow.crawlSessionId,
    applicationId: flow.appVersion.targetApplication.id,
    applicationName: flow.appVersion.targetApplication.name,
    versionId: flow.appVersion.id,
    version: flow.appVersion.version,
    checkpointStateHash: flow.checkpointStateHash,
    checkpointUrl: flow.checkpointUrl,
    isClipped: flow.isClipped,
    stepCount: flow.stepCount,
    createdAt: flow.createdAt.toISOString(),
  }));
}

async function getRecentActivities(projectId: string): Promise<ProjectActivity[]> {
  const rows = await prisma.projectActivity.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_LIMIT,
  });

  return rows.map((activity) => ({
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
  }));
}

export async function getProjectDashboard(projectId: string, versionId?: string): Promise<ProjectDashboardResponse> {
  const selectedVersion = await resolveVersion(projectId, versionId);
  const [coverage, runStatistics, latestRuns, latestCrawlSessions, latestTestFlows, recentActivities] = await Promise.all([
    getCoverage(selectedVersion),
    getRunStatistics(projectId),
    getLatestRuns(projectId),
    getLatestCrawlSessions(projectId),
    getLatestTestFlows(projectId),
    getRecentActivities(projectId),
  ]);

  return {
    selectedVersion: selectedVersion ? mapVersion(selectedVersion) : undefined,
    coverage,
    runStatistics,
    latestRuns,
    latestCrawlSessions,
    latestTestFlows,
    recentActivities,
  };
}
