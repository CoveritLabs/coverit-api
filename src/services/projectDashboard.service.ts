// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { TARGET_APPLICATION_MESSAGES } from "@constants/messages";
import {
  mapDashboardVersion,
  mapLatestCrawlSession,
  mapLatestRun,
  mapLatestTestFlow,
  mapProjectActivity,
  toIso,
  type DashboardVersionRow,
} from "@mappers/projectDashboard.mapper";
import type {
  ProjectCoverageSummary,
  ProjectDashboardResponse,
  ProjectLatestCrawlSession,
  ProjectLatestRun,
  ProjectLatestTestFlow,
  ProjectRunStatistics,
  ProjectActivity,
} from "@models/projectDashboard";
import { NotFoundError } from "@utils/errors";

const LATEST_LIMIT = 5;
const ACTIVITY_LIMIT = 10;

function sumValue(value?: number | null): number {
  return value ?? 0;
}

async function resolveVersion(projectId: string, versionId?: string): Promise<DashboardVersionRow | null> {
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

async function getCoverage(version: DashboardVersionRow | null): Promise<ProjectCoverageSummary> {
  if (!version) {
    return { percentage: 0, coveredTransitions: 0, totalTransitions: 0 } as ProjectCoverageSummary;
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
    } as ProjectCoverageSummary;
  }

  const flows = await prisma.testFlow.findMany({
    where: { crawlSessionId: session.id },
    select: { transitionRefs: true },
  });
  const coveredTransitions = new Set(flows.flatMap((flow) => flow.transitionRefs)).size;
  const percentage = Math.min(100, Math.round((coveredTransitions / session.transitionCount) * 10000) / 100);

  return {
    percentage,
    coveredTransitions,
    totalTransitions: session.transitionCount,
    crawlSessionId: session.id,
    calculatedAt: session.createdAt.toISOString(),
  } as ProjectCoverageSummary;
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
  } as ProjectRunStatistics;
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

  return rows.map(mapLatestRun);
}

async function getLatestCrawlSessions(projectId: string): Promise<ProjectLatestCrawlSession[]> {
  const rows = await prisma.crawlSession.findMany({
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

  return rows.map(mapLatestCrawlSession);
}

async function getLatestTestFlows(projectId: string): Promise<ProjectLatestTestFlow[]> {
  const rows = await prisma.testFlow.findMany({
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

  return rows.map(mapLatestTestFlow);
}

async function getRecentActivities(projectId: string): Promise<ProjectActivity[]> {
  const rows = await prisma.projectActivity.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_LIMIT,
  });

  return rows.map(mapProjectActivity);
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
    selectedVersion: selectedVersion ? mapDashboardVersion(selectedVersion) : undefined,
    coverage,
    runStatistics,
    latestRuns,
    latestCrawlSessions,
    latestTestFlows,
    recentActivities,
  } as ProjectDashboardResponse;
}
