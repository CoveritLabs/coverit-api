// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@lib/redis", () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));
jest.mock("@queues/arq/docgenArq", () => ({
  enqueueBddGeneration: jest.fn(),
}));
jest.mock("@queues/crawl.queue", () => ({
  addFlowEditorSessionJob: jest.fn(),
}));
jest.mock("@repositories/testFlowStepLabels.repository", () => ({
  getTestFlowStepLabels: jest.fn(),
}));

import prisma from "@lib/prisma";
import redis from "@lib/redis";
import { enqueueBddGeneration } from "@queues/arq/docgenArq";
import { addFlowEditorSessionJob } from "@queues/crawl.queue";
import { getTestFlowStepLabels } from "@repositories/testFlowStepLabels.repository";
import * as svc from "@services/testFlow.service";
import { ConflictError, NotFoundError } from "@utils/errors";

const mockPrisma = prisma as any;
const mockRedis = redis as any;
const mockEnqueueBddGeneration = enqueueBddGeneration as jest.Mock;
const mockAddFlowEditorSessionJob = addFlowEditorSessionJob as jest.Mock;
const mockGetTestFlowStepLabels = getTestFlowStepLabels as jest.Mock;

function flow(overrides: Record<string, any> = {}) {
  return {
    id: "flow-1",
    crawlSessionId: "session-1",
    appVersionId: "version-1",
    checkpointStateHash: "state-1",
    transitionRefs: ["transition-1"],
    editorSteps: [],
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
    mockAddFlowEditorSessionJob.mockResolvedValue("editor-job-1");
    mockGetTestFlowStepLabels.mockResolvedValue([]);
    mockRedis.set.mockResolvedValue("OK");
    mockRedis.get.mockResolvedValue(null);
    mockRedis.del.mockResolvedValue(1);
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
          editorStepCount: 0,
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
      graph_id: "session-1",
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
          editor_steps: [],
        },
      ],
    });
  });

  test("returns editor details with persisted draft steps", async () => {
    const draft = {
      id: "draft-1",
      kind: "assertion",
      position: { edge: "after", transitionId: "transition-1" },
      order: 1,
      label: "Assert cart",
      definition: {},
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z",
    };
    mockPrisma.testFlow.findFirst.mockResolvedValue(flow({ editorSteps: [draft] }));

    const result = await svc.getFlowEditor("project-1", "app-1", "flow-1");

    expect(result.editorSteps).toEqual([draft]);
    expect(result.flow.editorStepCount).toBe(1);
    expect(result.transitionSteps).toEqual([
      {
        id: "1:transition-1",
        index: 1,
        transitionId: "transition-1",
        label: "Transition 1",
        action: undefined,
        labelingStatus: "MISSING",
        fromState: undefined,
        toState: undefined,
      },
    ]);
  });

  test("returns editor details with Neo4j transition labels in flow order", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(
      flow({
        transitionRefs: ["transition-1", "transition-2"],
        stepCount: 2,
      }),
    );
    mockGetTestFlowStepLabels.mockResolvedValue([
      {
        transitionId: "transition-2",
        label: "Submit Checkout",
        action: "Click checkout button",
        labelingStatus: "COMPLETED",
      },
      {
        transitionId: "transition-1",
        label: "Open Cart",
        action: "Click cart link",
        labelingStatus: "COMPLETED",
        fromState: { stateHash: "state-1", label: "Home", labelingStatus: "COMPLETED" },
        toState: { stateHash: "state-2", label: "Cart", labelingStatus: "COMPLETED" },
      },
    ]);

    const result = await svc.getFlowEditor("project-1", "app-1", "flow-1");

    expect(mockGetTestFlowStepLabels).toHaveBeenCalledWith("session-1", ["transition-1", "transition-2"]);
    expect(result.transitionSteps.map((step) => step.label)).toEqual(["Open Cart", "Submit Checkout"]);
    expect(result.transitionSteps[0]).toEqual(
      expect.objectContaining({
        action: "Click cart link",
        labelingStatus: "COMPLETED",
        fromState: { stateHash: "state-1", label: "Home", labelingStatus: "COMPLETED" },
        toState: { stateHash: "state-2", label: "Cart", labelingStatus: "COMPLETED" },
      }),
    );
  });

  test("uses app version graph id for coverage editor labels", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(flow({ testFlowType: "COVERAGE" }));

    await svc.getFlowEditor("project-1", "app-1", "flow-1");

    expect(mockGetTestFlowStepLabels).toHaveBeenCalledWith("version-1", ["transition-1"]);
  });

  test("falls back to deterministic editor labels when Neo4j labels fail", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(flow());
    mockGetTestFlowStepLabels.mockRejectedValue(new Error("Neo4j unavailable"));

    const result = await svc.getFlowEditor("project-1", "app-1", "flow-1");

    expect(result.transitionSteps).toEqual([
      expect.objectContaining({
        transitionId: "transition-1",
        label: "Transition 1",
        labelingStatus: "MISSING",
      }),
    ]);
  });

  test("saves editor steps after validating transition anchors", async () => {
    const draft = {
      id: "draft-1",
      kind: "assertion" as const,
      position: { edge: "after" as const, transitionId: "transition-1" },
      order: 1,
      label: "Assert cart",
      definition: {},
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z",
    };
    mockPrisma.testFlow.findFirst.mockResolvedValue(flow());
    mockPrisma.testFlow.updateMany.mockResolvedValue({ count: 1 });

    const result = await svc.saveFlowEditorSteps("project-1", "app-1", "flow-1", { editorSteps: [draft] });

    expect(result.editorStepCount).toBe(1);
    expect(mockPrisma.testFlow.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ editorSteps: [draft] }),
      }),
    );
  });

  test("rejects editor steps anchored to unknown transitions", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(flow());

    await expect(
      svc.saveFlowEditorSteps("project-1", "app-1", "flow-1", {
        editorSteps: [
          {
            id: "draft-1",
            kind: "assertion",
            position: { edge: "after", transitionId: "missing-transition" },
            order: 1,
            label: "Invalid",
            definition: {},
            createdAt: "2026-06-22T00:00:00.000Z",
            updatedAt: "2026-06-22T00:00:00.000Z",
          },
        ],
      }),
    ).rejects.toThrow("targets a transition");
    expect(mockPrisma.testFlow.updateMany).not.toHaveBeenCalled();
  });

  test("connects editor sessions through the manual crawler queue", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(flow());

    const result = await svc.connectFlowEditor("project-1", "app-1", "flow-1", "user-1");

    expect(result.editorSessionId).toBeTruthy();
    expect(result.wsTicket).toBeTruthy();
    expect(mockAddFlowEditorSessionJob).toHaveBeenCalledWith(result.editorSessionId, "flow-1");
    expect(mockRedis.set).toHaveBeenCalled();
  });

  test("queues docgen generation with sorted editor steps", async () => {
    const afterDraft = {
      id: "draft-after",
      kind: "assertion",
      position: { edge: "after", transitionId: "transition-1" },
      order: 2,
      label: "Assert cart",
      definition: { type: "element", assertion: "text", expectedText: { source: "store", path: "cartTotal" } },
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z",
    };
    const beforeDraft = {
      id: "draft-before",
      kind: "design-operation",
      position: { edge: "before", transitionId: "transition-1" },
      order: 1,
      label: "Set cart total",
      definition: { type: "set", key: "cartTotal", value: { literal: "$42.00" } },
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z",
    };
    mockPrisma.testFlow.findFirst.mockResolvedValue(
      flow({
        editorSteps: [afterDraft, beforeDraft],
        generatedAt: new Date("2026-06-22T00:04:00.000Z"),
        modifiedAt: new Date("2026-06-22T00:05:00.000Z"),
      }),
    );

    await svc.generateTestFlow("project-1", "app-1", "flow-1", {
      regressionCodebaseId: "codebase-1",
      codegenConfig: { codegenBranch: "auto-tests", prTargetBranch: "main" },
    });

    expect(mockEnqueueBddGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        flows: [
          expect.objectContaining({
            editor_steps: [beforeDraft, afterDraft],
          }),
        ],
      }),
    );
  });

  test("queues docgen generation for a coverage flow with app version graph id", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(
      flow({
        id: "flow-coverage",
        testFlowType: "COVERAGE",
        generatedAt: new Date("2026-06-22T00:04:00.000Z"),
        modifiedAt: new Date("2026-06-22T00:05:00.000Z"),
      }),
    );

    await svc.generateTestFlow("project-1", "app-1", "flow-coverage", {
      regressionCodebaseId: "codebase-1",
      codegenConfig: { codegenBranch: "auto-tests", prTargetBranch: "main" },
    });

    expect(mockEnqueueBddGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "session-1",
        graph_id: "version-1",
        flow_ids: ["flow-coverage"],
      }),
    );
  });

  test("queues docgen generation for a bug reproduction flow with crawl session graph id", async () => {
    mockPrisma.testFlow.findFirst.mockResolvedValue(
      flow({
        id: "flow-bug",
        testFlowType: "BUG_REPRODUCTION",
        generatedAt: new Date("2026-06-22T00:04:00.000Z"),
        modifiedAt: new Date("2026-06-22T00:05:00.000Z"),
      }),
    );

    await svc.generateTestFlow("project-1", "app-1", "flow-bug", {
      regressionCodebaseId: "codebase-1",
      codegenConfig: { codegenBranch: "auto-tests", prTargetBranch: "main" },
    });

    expect(mockEnqueueBddGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "session-1",
        graph_id: "session-1",
        flow_ids: ["flow-bug"],
      }),
    );
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
