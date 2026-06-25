// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));

import prisma from "@lib/prisma";
import * as svc from "@services/projectDashboard.service";

const mockPrisma = prisma as any;
const createdAt = new Date("2026-06-22T10:00:00.000Z");
const later = new Date("2026-06-23T10:00:00.000Z");

describe("projectDashboard.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockPrisma.targetApplicationVersion = { findMany: jest.fn() };
    mockPrisma.crawlSession = { aggregate: jest.fn(), findMany: jest.fn() };
    mockPrisma.regressionRun = { aggregate: jest.fn(), findMany: jest.fn() };
    mockPrisma.scenarioIntegrationReport = { count: jest.fn() };
    mockPrisma.testFlow = { findMany: jest.fn() };
    mockPrisma.projectActivity = { findMany: jest.fn() };
  });

  test("computes coverage from coverage flows and summed completed on-demand sessions", async () => {
    mockPrisma.targetApplicationVersion.findMany.mockResolvedValue([
      {
        id: "version-new",
        version: "2.0.0",
        createdAt: later,
        targetApplication: { id: "app1", name: "Web App" },
      },
      {
        id: "version-old",
        version: "1.0.0",
        createdAt,
        targetApplication: { id: "app1", name: "Web App" },
      },
      {
        id: "version-api",
        version: "2026.06",
        createdAt,
        targetApplication: { id: "app2", name: "API" },
      },
    ]);
    mockPrisma.crawlSession.findMany
      .mockResolvedValueOnce([
        { appVersionId: "version-new", stateCount: 4, transitionCount: 5, createdAt, finishedAt: createdAt },
        { appVersionId: "version-new", stateCount: 3, transitionCount: 3, createdAt: later, finishedAt: later },
        { appVersionId: "version-old", stateCount: 5, transitionCount: 10, createdAt, finishedAt: createdAt },
        { appVersionId: "version-api", stateCount: 0, transitionCount: 0, createdAt, finishedAt: null },
      ])
      .mockResolvedValueOnce([
        {
          id: "session1",
          stateCount: 4,
          transitionCount: 5,
          createdAt,
          finishedAt: createdAt,
          appVersion: { id: "version-new", version: "2.0.0", targetApplication: { id: "app1", name: "Web App" } },
        },
      ]);
    mockPrisma.testFlow.findMany
      .mockResolvedValueOnce([
        { appVersionId: "version-new", transitionRefs: ["a", "b", "b", "c"] },
        { appVersionId: "version-new", transitionRefs: ["d"] },
        { appVersionId: "version-old", transitionRefs: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"] },
      ])
      .mockResolvedValueOnce([
        { testFlowType: "COVERAGE", stepCount: 3, generatedAt: later, modifiedAt: createdAt },
        { testFlowType: "MANUAL", stepCount: 2, generatedAt: null, modifiedAt: later },
      ]);
    mockPrisma.crawlSession.aggregate.mockResolvedValue({
      _count: { _all: 3 },
      _sum: { stateCount: 12, transitionCount: 18 },
    });
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
        durationMs: 1200,
        passedCount: 3,
        warningCount: 1,
        failedCount: 1,
        createdAt,
        targetApplication: { id: "app1", name: "Web App" },
        version: { id: "version-new", version: "2.0.0" },
      },
    ]);
    mockPrisma.projectActivity.findMany.mockResolvedValue([
      {
        id: "activity1",
        projectId: "project1",
        eventType: "manual_session.connected",
        entityType: "crawl_session",
        entityId: "session1",
        message: "Connected manual session",
        actorUserId: "user1",
        actorName: "Ada",
        actorEmail: "ada@example.test",
        createdAt,
      },
    ]);

    const dashboard = await svc.getProjectDashboard("project1");

    expect(mockPrisma.crawlSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "COMPLETED", triggerType: "ON_DEMAND" }),
    }));
    expect(mockPrisma.testFlow.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ testFlowType: "COVERAGE" }),
      select: { appVersionId: true, transitionRefs: true },
    }));
    expect(dashboard.totals).toEqual({
      totalStates: 12,
      totalTransitions: 18,
      totalOnDemandSessions: 3,
      totalRuns: 2,
      passedCount: 7,
      warningCount: 2,
      failedCount: 1,
      reportedWarningCount: 2,
      reportedFailedCount: 1,
    });
    expect(dashboard.coverageByVersion).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          versionId: "version-new",
          coveredTransitions: 4,
          totalTransitions: 8,
          totalStates: 7,
          sessionCount: 2,
          percentage: 50,
        }),
        expect.objectContaining({
          versionId: "version-old",
          coveredTransitions: 11,
          totalTransitions: 10,
          percentage: 100,
        }),
      ]),
    );
    expect(dashboard.coverageByApplication).toEqual([
      expect.objectContaining({ applicationId: "app1", versionId: "version-new" }),
      expect.objectContaining({ applicationId: "app2", versionId: "version-api" }),
    ]);
    expect(dashboard.runTrend[0]).toEqual(expect.objectContaining({ displayName: "Run #2", durationMs: 1200 }));
    expect(dashboard.testFlowBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "coverage", count: 1, generatedCount: 1 }),
        expect.objectContaining({ type: "manual", count: 1, pendingCount: 1 }),
      ]),
    );
    expect(dashboard.recentActivities[0]).toEqual(expect.objectContaining({ actorName: "Ada" }));
  });

  test("returns empty dashboard aggregates when the project has no activity", async () => {
    mockPrisma.targetApplicationVersion.findMany.mockResolvedValue([]);
    mockPrisma.crawlSession.findMany.mockResolvedValue([]);
    mockPrisma.testFlow.findMany.mockResolvedValue([]);
    mockPrisma.crawlSession.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: {} });
    mockPrisma.regressionRun.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: {} });
    mockPrisma.scenarioIntegrationReport.count.mockResolvedValue(0);
    mockPrisma.regressionRun.findMany.mockResolvedValue([]);
    mockPrisma.projectActivity.findMany.mockResolvedValue([]);

    const dashboard = await svc.getProjectDashboard("project1");

    expect(dashboard.totals.totalStates).toBe(0);
    expect(dashboard.coverageByApplication).toEqual([]);
    expect(dashboard.coverageByVersion).toEqual([]);
    expect(dashboard.runTrend).toEqual([]);
    expect(dashboard.recentActivities).toEqual([]);
  });
});
