// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@queues/arq/docgenArq", () => ({
  enqueueBddGeneration: jest.fn(),
}));

import prisma from "@lib/prisma";
import { enqueueBddGeneration } from "@queues/arq/docgenArq";
import * as svc from "@services/testFlow.service";
import { ConflictError, NotFoundError } from "@utils/errors";

const mockPrisma = prisma as any;
const mockEnqueueBddGeneration = enqueueBddGeneration as jest.Mock;

function flow(overrides: Record<string, any> = {}) {
  return {
    id: "flow-1",
    crawlSessionId: "session-1",
    appVersionId: "version-1",
    checkpointStateHash: "state-1",
    transitionRefs: ["transition-1"],
    testFlowType: "MANUAL",
    stepCount: 1,
    createdAt: new Date("2026-06-22T00:00:00.000Z"),
    generatedAt: null,
    modifiedAt: new Date("2026-06-22T00:05:00.000Z"),
    appVersion: {
      version: "v1.0.0",
    },
    crawlSession: {
      id: "session-1",
      triggerType: "MANUAL",
      status: "COMPLETED",
      createdAt: new Date("2026-06-22T00:00:00.000Z"),
      finishedAt: new Date("2026-06-22T00:10:00.000Z"),
    },
    ...overrides,
  };
}

describe("testFlow.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.targetApplication.findUnique.mockResolvedValue({ id: "app-1", projectId: "project-1" });
    mockPrisma.testFlow.findMany.mockResolvedValue([flow()]);
    mockPrisma.regressionCodebase.findUnique.mockResolvedValue({ id: "codebase-1", targetApplicationId: "app-1" });
    mockEnqueueBddGeneration.mockResolvedValue("job-1");
  });

  test("lists flows scoped to project and application", async () => {
    const result = await svc.listTestFlows("project-1", "app-1", { limit: 25 });

    expect(result).toEqual({
      flows: [
        {
          id: "flow-1",
          crawlSessionId: "session-1",
          appVersionId: "version-1",
          appVersionName: "v1.0.0",
          checkpointStateHash: "state-1",
          transitionRefs: ["transition-1"],
          testFlowType: "MANUAL",
          stepCount: 1,
          status: "NEEDS_GENERATION",
          createdAt: "2026-06-22T00:00:00.000Z",
          generatedAt: null,
          modifiedAt: "2026-06-22T00:05:00.000Z",
          crawlSession: {
            id: "session-1",
            triggerType: "MANUAL",
            status: "COMPLETED",
            createdAt: "2026-06-22T00:00:00.000Z",
            finishedAt: "2026-06-22T00:10:00.000Z",
          },
        },
      ],
      nextCursor: null,
    });
    expect(mockPrisma.testFlow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          appVersion: {
            targetApplicationId: "app-1",
            targetApplication: { projectId: "project-1" },
          },
        }),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: expect.objectContaining({
          appVersion: expect.any(Object),
          crawlSession: expect.any(Object),
        }),
        take: 26,
      }),
    );
  });

  test("applies optional filters and cursor pagination", async () => {
    mockPrisma.testFlow.findMany.mockResolvedValue([
      flow({ id: "flow-2", testFlowType: "BUG_REPRODUCTION" }),
      flow({ id: "flow-3", testFlowType: "BUG_REPRODUCTION" }),
    ]);

    const result = await svc.listTestFlows("project-1", "app-1", {
      versionId: "version-1",
      sessionId: "session-1",
      type: "BUG_REPRODUCTION" as any,
      cursor: "flow-1",
      limit: 1,
    });

    expect(result.nextCursor).toBe("flow-3");
    expect(result.flows).toHaveLength(1);
    expect(mockPrisma.testFlow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          appVersionId: "version-1",
          crawlSessionId: "session-1",
          testFlowType: "BUG_REPRODUCTION",
        }),
        cursor: { id: "flow-1" },
        skip: 1,
        take: 2,
      }),
    );
  });

  test("rejects applications outside the project", async () => {
    mockPrisma.targetApplication.findUnique.mockResolvedValue({ id: "app-1", projectId: "other-project" });

    await expect(svc.listTestFlows("project-1", "app-1", { limit: 25 })).rejects.toThrow(NotFoundError);
    expect(mockPrisma.testFlow.findMany).not.toHaveBeenCalled();
  });

  test("queues docgen generation for a stale flow", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(
      flow({
        id: "flow-2",
        generatedAt: new Date("2026-06-22T00:04:00.000Z"),
        modifiedAt: new Date("2026-06-22T00:05:00.000Z"),
      }),
    );

    const result = await svc.generateTestFlow("project-1", "app-1", "flow-2", {
      regressionCodebaseId: "codebase-1",
      codegenConfig: {
        codegenBranch: "auto-tests",
        prTargetBranch: "main",
        prDraft: true,
      },
    });

    expect(result).toEqual({
      message: "Test flow generation queued",
      flowId: "flow-2",
      jobId: "job-1",
    });
    expect(mockEnqueueBddGeneration).toHaveBeenCalledWith({
      session_id: "session-1",
      regression_codebase_id: "codebase-1",
      codegen_config: {
        codegenBranch: "auto-tests",
        prTargetBranch: "main",
        prDraft: true,
      },
      flow_ids: ["flow-2"],
      flows: [
        {
          flow_id: "flow-2",
          checkpoint_hash: "state-1",
          transition_ids: ["transition-1"],
        },
      ],
    });
  });

  test("rejects generation for a generated flow", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(
      flow({
        generatedAt: new Date("2026-06-22T00:06:00.000Z"),
        modifiedAt: new Date("2026-06-22T00:05:00.000Z"),
      }),
    );

    await expect(
      svc.generateTestFlow("project-1", "app-1", "flow-1", {
        regressionCodebaseId: "codebase-1",
        codegenConfig: { codegenBranch: "auto-tests", prTargetBranch: "main" },
      }),
    ).rejects.toThrow(ConflictError);
    expect(mockEnqueueBddGeneration).not.toHaveBeenCalled();
  });

  test("rejects generation with a codebase from another application", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(flow());
    mockPrisma.regressionCodebase.findUnique.mockResolvedValue({ id: "codebase-1", targetApplicationId: "other-app" });

    await expect(
      svc.generateTestFlow("project-1", "app-1", "flow-1", {
        regressionCodebaseId: "codebase-1",
        codegenConfig: { codegenBranch: "auto-tests", prTargetBranch: "main" },
      }),
    ).rejects.toThrow(NotFoundError);
    expect(mockEnqueueBddGeneration).not.toHaveBeenCalled();
  });

  test("marks matching flow ids generated", async () => {
    mockPrisma.testFlow.updateMany.mockResolvedValue({ count: 1 });
    const generatedAt = new Date("2026-06-22T00:15:00.000Z");

    const count = await svc.markTestFlowsGenerated("session-1", ["flow-1", "flow-1"], generatedAt);

    expect(count).toBe(1);
    expect(mockPrisma.testFlow.updateMany).toHaveBeenCalledWith({
      where: {
        crawlSessionId: "session-1",
        id: { in: ["flow-1"] },
      },
      data: { generatedAt },
    });
  });
});
