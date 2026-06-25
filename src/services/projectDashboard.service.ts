// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import {
  CrawlStatus as PrismaCrawlStatus,
  CrawlTriggerType as PrismaCrawlTriggerType,
  TestFlowType as PrismaTestFlowType,
} from "@generated/prisma/client";
import prisma from "@lib/prisma";
import {
  mapCrawlSessionTrendPoint,
  mapProjectActivity,
  mapRunTrendPoint,
} from "@mappers/projectDashboard.mapper";
import type {
  ProjectActivity,
  ProjectCoveragePoint,
  ProjectDashboardResponse,
  ProjectDashboardTotals,
  ProjectTestFlowBreakdownPoint,
} from "@models/projectDashboard";

const ACTIVITY_LIMIT = 10;
const RUN_TREND_LIMIT = 14;
const CRAWL_TREND_LIMIT = 12;

type VersionRow = {
  id: string;
  version: string;
  createdAt: Date;
  targetApplication: {
    id: string;
    name: string;
  };
};

type CoverageStats = {
  totalStates: number;
  totalTransitions: number;
  sessionCount: number;
  calculatedAt?: string;
};

function sumValue(value?: number | null): number {
  return value ?? 0;
}

function percentage(coveredTransitions: number, totalTransitions: number): number {
  if (totalTransitions <= 0) return 0;
  return Math.min(100, Math.round((coveredTransitions / totalTransitions) * 10000) / 100);
}

function isGenerated(generatedAt?: Date | null, modifiedAt?: Date | null): boolean {
  if (!generatedAt) return false;
  return !modifiedAt || generatedAt.getTime() >= modifiedAt.getTime();
}

function isStale(generatedAt?: Date | null, modifiedAt?: Date | null): boolean {
  return Boolean(generatedAt && modifiedAt && modifiedAt.getTime() > generatedAt.getTime());
}

async function getVersions(projectId: string): Promise<VersionRow[]> {
  return prisma.targetApplicationVersion.findMany({
    where: { targetApplication: { projectId } },
    orderBy: [{ targetApplication: { name: "asc" } }, { createdAt: "desc" }],
    include: { targetApplication: { select: { id: true, name: true } } },
  });
}

function latestVersionByApplication(versions: VersionRow[]): Map<string, VersionRow> {
  const latest = new Map<string, VersionRow>();
  for (const version of versions) {
    const existing = latest.get(version.targetApplication.id);
    if (!existing || version.createdAt.getTime() > existing.createdAt.getTime()) {
      latest.set(version.targetApplication.id, version);
    }
  }
  return latest;
}

async function getCoverageStats(projectId: string): Promise<Map<string, CoverageStats>> {
  const sessions = await prisma.crawlSession.findMany({
    where: {
      status: PrismaCrawlStatus.COMPLETED,
      triggerType: PrismaCrawlTriggerType.ON_DEMAND,
      appVersion: { targetApplication: { projectId } },
    },
    select: {
      appVersionId: true,
      stateCount: true,
      transitionCount: true,
      finishedAt: true,
      createdAt: true,
    },
  });

  const byVersion = new Map<string, CoverageStats>();
  for (const session of sessions) {
    const current = byVersion.get(session.appVersionId) ?? {
      totalStates: 0,
      totalTransitions: 0,
      sessionCount: 0,
      calculatedAt: undefined,
    };
    const calculatedAt = session.finishedAt ?? session.createdAt;
    if (!current.calculatedAt || calculatedAt.getTime() > new Date(current.calculatedAt).getTime()) {
      current.calculatedAt = calculatedAt.toISOString();
    }
    current.totalStates += session.stateCount;
    current.totalTransitions += session.transitionCount;
    current.sessionCount += 1;
    byVersion.set(session.appVersionId, current);
  }

  return byVersion;
}

async function getCoveredTransitions(projectId: string): Promise<Map<string, Set<string>>> {
  const flows = await prisma.testFlow.findMany({
    where: {
      testFlowType: PrismaTestFlowType.COVERAGE,
      appVersion: { targetApplication: { projectId } },
    },
    select: {
      appVersionId: true,
      transitionRefs: true,
    },
  });

  const byVersion = new Map<string, Set<string>>();
  for (const flow of flows) {
    const refs = byVersion.get(flow.appVersionId) ?? new Set<string>();
    for (const ref of flow.transitionRefs) {
      refs.add(ref);
    }
    byVersion.set(flow.appVersionId, refs);
  }
  return byVersion;
}

function buildCoveragePoint(
  version: VersionRow,
  stats: CoverageStats | undefined,
  coveredRefs: Set<string> | undefined,
): ProjectCoveragePoint {
  const coveredTransitions = coveredRefs?.size ?? 0;
  const totalTransitions = stats?.totalTransitions ?? 0;
  return {
    applicationId: version.targetApplication.id,
    applicationName: version.targetApplication.name,
    versionId: version.id,
    version: version.version,
    percentage: percentage(coveredTransitions, totalTransitions),
    coveredTransitions,
    totalTransitions,
    totalStates: stats?.totalStates ?? 0,
    sessionCount: stats?.sessionCount ?? 0,
    calculatedAt: stats?.calculatedAt,
  };
}

async function getCoverage(projectId: string): Promise<{
  byApplication: ProjectCoveragePoint[];
  byVersion: ProjectCoveragePoint[];
}> {
  const [versions, statsByVersion, coveredByVersion] = await Promise.all([
    getVersions(projectId),
    getCoverageStats(projectId),
    getCoveredTransitions(projectId),
  ]);

  const byVersion = versions.map((version) =>
    buildCoveragePoint(version, statsByVersion.get(version.id), coveredByVersion.get(version.id)),
  );
  const latest = latestVersionByApplication(versions);
  const latestIds = new Set([...latest.values()].map((version) => version.id));

  return {
    byApplication: byVersion.filter((point) => latestIds.has(point.versionId)),
    byVersion,
  };
}

async function getTotals(projectId: string): Promise<ProjectDashboardTotals> {
  const [sessionTotals, runTotals, reportedWarningCount, reportedFailedCount] = await Promise.all([
    prisma.crawlSession.aggregate({
      where: {
        status: PrismaCrawlStatus.COMPLETED,
        triggerType: PrismaCrawlTriggerType.ON_DEMAND,
        appVersion: { targetApplication: { projectId } },
      },
      _count: { _all: true },
      _sum: { stateCount: true, transitionCount: true },
    }),
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
    totalStates: sumValue(sessionTotals._sum?.stateCount),
    totalTransitions: sumValue(sessionTotals._sum?.transitionCount),
    totalOnDemandSessions: sessionTotals._count?._all ?? 0,
    totalRuns: runTotals._count?._all ?? 0,
    passedCount: sumValue(runTotals._sum?.passedCount),
    warningCount: sumValue(runTotals._sum?.warningCount),
    failedCount: sumValue(runTotals._sum?.failedCount),
    reportedWarningCount,
    reportedFailedCount,
  };
}

async function getRunTrend(projectId: string) {
  const rows = await prisma.regressionRun.findMany({
    where: { targetApplication: { projectId } },
    orderBy: { createdAt: "desc" },
    take: RUN_TREND_LIMIT,
    include: {
      targetApplication: { select: { id: true, name: true } },
      version: { select: { id: true, version: true } },
    },
  });

  return rows.reverse().map(mapRunTrendPoint);
}

async function getCrawlSessionTrend(projectId: string) {
  const rows = await prisma.crawlSession.findMany({
    where: {
      status: PrismaCrawlStatus.COMPLETED,
      triggerType: PrismaCrawlTriggerType.ON_DEMAND,
      appVersion: { targetApplication: { projectId } },
    },
    orderBy: { createdAt: "desc" },
    take: CRAWL_TREND_LIMIT,
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

  return rows.reverse().map(mapCrawlSessionTrendPoint);
}

async function getTestFlowBreakdown(projectId: string): Promise<ProjectTestFlowBreakdownPoint[]> {
  const rows = await prisma.testFlow.findMany({
    where: { appVersion: { targetApplication: { projectId } } },
    select: {
      testFlowType: true,
      stepCount: true,
      generatedAt: true,
      modifiedAt: true,
    },
  });

  const byType = new Map<string, ProjectTestFlowBreakdownPoint>();
  for (const row of rows) {
    const type = row.testFlowType.toLowerCase();
    const point = byType.get(type) ?? {
      type,
      count: 0,
      totalSteps: 0,
      generatedCount: 0,
      staleCount: 0,
      pendingCount: 0,
    };
    point.count += 1;
    point.totalSteps += row.stepCount;
    if (isGenerated(row.generatedAt, row.modifiedAt)) {
      point.generatedCount += 1;
    } else if (isStale(row.generatedAt, row.modifiedAt)) {
      point.staleCount += 1;
    } else {
      point.pendingCount += 1;
    }
    byType.set(type, point);
  }

  return [...byType.values()].sort((a, b) => a.type.localeCompare(b.type));
}

async function getRecentActivities(projectId: string): Promise<ProjectActivity[]> {
  const rows = await prisma.projectActivity.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_LIMIT,
  });

  return rows.map(mapProjectActivity);
}

export async function getProjectDashboard(projectId: string): Promise<ProjectDashboardResponse> {
  const [totals, coverage, runTrend, crawlSessionTrend, testFlowBreakdown, recentActivities] = await Promise.all([
    getTotals(projectId),
    getCoverage(projectId),
    getRunTrend(projectId),
    getCrawlSessionTrend(projectId),
    getTestFlowBreakdown(projectId),
    getRecentActivities(projectId),
  ]);

  return {
    totals,
    coverageByApplication: coverage.byApplication,
    coverageByVersion: coverage.byVersion,
    runTrend,
    crawlSessionTrend,
    testFlowBreakdown,
    recentActivities,
  };
}
