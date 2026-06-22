// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));

import prisma from "@lib/prisma";
import * as svc from "@services/projectDashboard.service";
import { NotFoundError } from "@utils/errors";

const mockPrisma = prisma as any;
const createdAt = new Date("2026-06-22T10:00:00.000Z");

describe("projectDashboard.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockPrisma.targetApplicationVersion = { findFirst: jest.fn() };
    mockPrisma.crawlSession = { findFirst: jest.fn(), findMany: jest.fn() };
    mockPrisma.testFlowStep = { findMany: jest.fn() };
    mockPrisma.regressionRun = { aggregate: jest.fn(), findMany: jest.fn() };
    mockPrisma.scenarioIntegrationReport = { count: jest.fn() };
    mockPrisma.testFlow = { findMany: jest.fn() };
    mockPrisma.projectActivity = { findMany: jest.fn() };
  });

  test("uses latest version when versionId is omitted and computes dashboard aggregates", async () => {
    mockPrisma.targetApplicationVersion.findFirst.mockResolvedValue({
      id: "version1",
      version: "1.0.0",
      targetApplicationId: "app1",
      createdAt,
      targetApplication: { id: "app1", name: "Web App" },
    });
    mockPrisma.crawlSession.findFirst.mockResolvedValue({ id: "session1", transitionCount: 4, createdAt });
    mockPrisma.testFlowStep.findMany.mockResolvedValue([
      { actionFingerprint: "a" },
      { actionFingerprint: "b" },
      { actionFingerprint: "c" },
    ]);
    mockPrisma.regressionRun.aggregate.mockResolvedValue({
      _count: { _all: 2 },
      _sum: { passedCount: 7, warningCount: 2, failedCount: 1 },
    });
    mockPrisma.scenarioIntegrationReport.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    mockPrisma.regressionRun.findMany.mockResolvedValue([
      {
        id: "runDb1",
        runId: "run-1",
        name: "Run",
        nameNumber: 2,
        status: "FAILED",
        passedCount: 3,
        warningCount: 1,
        failedCount: 1,
        createdAt,
        targetApplication: { id: "app1", name: "Web App" },
        version: { id: "version1", version: "1.0.0" },
      },
    ]);
    mockPrisma.crawlSession.findMany.mockResolvedValue([
      {
        id: "session1",
        status: "COMPLETED",
        triggerType: "ON_DEMAND",
        stateCount: 5,
        transitionCount: 4,
        createdAt,
        startedAt: createdAt,
        finishedAt: createdAt,
        appVersion: { id: "version1", version: "1.0.0", targetApplication: { id: "app1", name: "Web App" } },
      },
    ]);
    mockPrisma.testFlow.findMany.mockResolvedValue([
      {
        id: "flow1",
        crawlSessionId: "session1",
        checkpointStateHash: "state-123",
        checkpointUrl: "https://example.test",
        isClipped: false,
        stepCount: 3,
        createdAt,
        appVersion: { id: "version1", version: "1.0.0", targetApplication: { id: "app1", name: "Web App" } },
      },
    ]);
    mockPrisma.projectActivity.findMany.mockResolvedValue([
      {
        id: "activity1",
        projectId: "project1",
        eventType: "project.created",
        entityType: "project",
        entityId: "project1",
        message: "Created project",
        actorUserId: "user1",
        actorName: "Ada",
        actorEmail: "ada@example.test",
        createdAt,
      },
    ]);

    const dashboard = await svc.getProjectDashboard("project1");

    expect(mockPrisma.targetApplicationVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { targetApplication: { projectId: "project1" } },
      orderBy: { createdAt: "desc" },
    }));
    expect(dashboard.selectedVersion).toEqual(expect.objectContaining({ id: "version1", applicationName: "Web App" }));
    expect(dashboard.coverage).toEqual(expect.objectContaining({ percentage: 75, coveredTransitions: 3, totalTransitions: 4 }));
    expect(dashboard.runStatistics).toEqual({
      passedCount: 7,
      warningCount: 2,
      failedCount: 1,
      reportedWarningCount: 2,
      reportedFailedCount: 1,
      totalRuns: 2,
    });
    expect(dashboard.latestRuns[0]).toEqual(expect.objectContaining({ displayName: "Run #2", status: "failed" }));
    expect(dashboard.latestCrawlSessions[0]).toEqual(expect.objectContaining({ status: "completed", triggerType: "on_demand" }));
    expect(dashboard.latestTestFlows[0]).toEqual(expect.objectContaining({ id: "flow1", stepCount: 3 }));
    expect(dashboard.recentActivities[0]).toEqual(expect.objectContaining({ actorName: "Ada" }));
  });

  test("throws when an explicit version does not belong to the project", async () => {
    mockPrisma.targetApplicationVersion.findFirst.mockResolvedValue(null);

    await expect(svc.getProjectDashboard("project1", "version-other")).rejects.toThrow(NotFoundError);
  });

  test("returns empty dashboard when the project has no versions or activity", async () => {
    mockPrisma.targetApplicationVersion.findFirst.mockResolvedValue(null);
    mockPrisma.regressionRun.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: {} });
    mockPrisma.scenarioIntegrationReport.count.mockResolvedValue(0);
    mockPrisma.regressionRun.findMany.mockResolvedValue([]);
    mockPrisma.crawlSession.findMany.mockResolvedValue([]);
    mockPrisma.testFlow.findMany.mockResolvedValue([]);
    mockPrisma.projectActivity.findMany.mockResolvedValue([]);

    const dashboard = await svc.getProjectDashboard("project1");

    expect(dashboard.selectedVersion).toBeUndefined();
    expect(dashboard.coverage).toEqual({ percentage: 0, coveredTransitions: 0, totalTransitions: 0 });
    expect(dashboard.latestRuns).toEqual([]);
    expect(dashboard.recentActivities).toEqual([]);
  });
});
