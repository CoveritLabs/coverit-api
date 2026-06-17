// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));

import prisma from "@lib/prisma";
import * as svc from "@services/regressionRun.service";
import { hashToken } from "@utils/token";
import { NotFoundError, UnauthorizedError } from "@utils/errors";

describe("regressionRun.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (prisma as any).targetApplication = {
      findUnique: jest.fn(),
    };
    (prisma as any).targetApplicationVersion = {
      findFirst: jest.fn(),
    };
    (prisma as any).regressionRun = {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    };
    (prisma as any).regressionScenario = {
      upsert: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    };
    (prisma as any).regressionEvent = {
      create: jest.fn(),
      findMany: jest.fn(),
    };
    (prisma as any).regressionArtifact = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    };
  });

  test("authenticateApplicationApiKey - rejects unknown key", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue(null);

    await expect(svc.authenticateApplicationApiKey("bad")).rejects.toThrow(UnauthorizedError);
    expect((prisma as any).targetApplication.findUnique).toHaveBeenCalledWith({ where: { apiKeyHash: hashToken("bad") } });
  });

  test("ingestEvents - stores event and ignores legacy projectId", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.upsert.mockResolvedValue({ id: "run-db-1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue({ status: "RUNNING" });
    (prisma as any).regressionScenario.upsert.mockResolvedValue({ id: "scenario1" });
    (prisma as any).regressionEvent.create.mockResolvedValue({});
    (prisma as any).regressionEvent.findMany.mockResolvedValue([]);
    (prisma as any).regressionRun.update.mockResolvedValue({});
    (prisma as any).regressionScenario.update.mockResolvedValue({});

    await svc.ingestEvents("key", "run-1", {
      id: "event1",
      type: "scenario.status",
      timestamp: "2026-06-13T22:18:20.073Z",
      runId: "run-1",
      applicationId: "app1",
      projectId: "legacy-project",
      payload: { status: "running", title: "Happy path", file: "test.ts", line: 10 },
    } as any);

    expect((prisma as any).regressionRun.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { targetApplicationId_runId: { targetApplicationId: "app1", runId: "run-1" } },
    }));
    expect((prisma as any).regressionEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        id: "event1",
        runDbId: "run-db-1",
        scenarioId: "scenario1",
        type: "scenario.status",
        status: "running",
      }),
    }));
  });

  test("ingestEvents - does not downgrade a completed run to running", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.upsert.mockResolvedValue({ id: "run-db-1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue({ status: "PASSED" });
    (prisma as any).regressionScenario.upsert.mockResolvedValue({ id: "scenario1" });
    (prisma as any).regressionEvent.create.mockResolvedValue({});
    (prisma as any).regressionEvent.findMany.mockResolvedValue([]);
    (prisma as any).regressionRun.update.mockResolvedValue({});
    (prisma as any).regressionScenario.update.mockResolvedValue({});

    await svc.ingestEvents("key", "run-1", {
      id: "event1",
      type: "scenario.status",
      timestamp: "2026-06-13T22:18:27.073Z",
      runId: "run-1",
      applicationId: "app1",
      payload: { status: "passed", title: "Happy path" },
    } as any);

    expect((prisma as any).regressionRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run-db-1" },
      data: expect.objectContaining({ status: "PASSED" }),
    }));
  });

  test("ingestEvents - rejects invalid version", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).targetApplicationVersion.findFirst.mockResolvedValue(null);

    await expect(svc.ingestEvents("key", "run-1", {
      id: "event1",
      type: "log",
      timestamp: "2026-06-13T22:18:20.073Z",
      runId: "run-1",
      applicationId: "app1",
      versionId: "version-other",
      payload: { level: "info", message: "hello" },
    })).rejects.toThrow(NotFoundError);
  });

  test("completeRun - stores summary artifact", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.upsert.mockResolvedValue({ id: "run-db-1" });
    (prisma as any).regressionArtifact.create.mockResolvedValue({});

    const res = await svc.completeRun("key", "run-1", {
      applicationId: "app1",
      status: "passed",
      startedAt: "2026-06-13T22:18:20.073Z",
      finishedAt: "2026-06-13T22:18:27.073Z",
      durationMs: 7000,
      totals: { passed: 2, failed: 0, warnings: 1 },
      reports: [],
    });

    expect(res.message).toBe("Regression run completed");
    expect((prisma as any).regressionRun.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ status: "PASSED", passedCount: 2, failedCount: 0, warningCount: 1 }),
    }));
    expect((prisma as any).regressionArtifact.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ runDbId: "run-db-1", kind: "SUMMARY" }),
    }));
  });

  test("listRuns - filters by application and version", async () => {
    const createdAt = new Date("2026-06-13T22:18:20.073Z");
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findMany.mockResolvedValue([{
      id: "db1",
      runId: "run-1",
      targetApplicationId: "app1",
      versionId: "v1",
      status: "PASSED",
      passedCount: 2,
      failedCount: 0,
      warningCount: 1,
      createdAt,
      updatedAt: createdAt,
    }]);

    const res = await svc.listRuns("p1", "app1", { versionId: "v1", status: "passed", limit: 25 });

    expect(res.runs).toEqual([expect.objectContaining({ runId: "run-1", status: "passed", versionId: "v1" })]);
    expect((prisma as any).regressionRun.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { targetApplicationId: "app1", versionId: "v1", status: "PASSED" },
    }));
  });

  test("uploadArtifact - stores DagsHub metadata when upload succeeds", async () => {
    const createdAt = new Date("2026-06-13T22:18:20.073Z");
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.upsert.mockResolvedValue({ id: "run-db-1" });
    (prisma as any).regressionScenario.upsert.mockResolvedValue({ id: "scenario1", scenarioKey: "Feature::Scenario" });
    (prisma as any).regressionArtifact.create.mockResolvedValue({
      id: "artifact1",
      runDbId: "run-db-1",
      scenarioId: "scenario1",
      kind: "VIDEO",
      name: "run.webm",
      data: {},
      contentType: "video/webm",
      sizeBytes: BigInt(5),
      storageProvider: "dagshub",
      storageUri: "https://dagshub.example/artifact",
      storagePath: "coverit/app1/run-1/Feature-Scenario/run.webm",
      checksumSha256: "hash",
      uploadStatus: "UPLOADED",
      metadata: { relativePath: "videos/run.webm" },
      createdAt,
      updatedAt: createdAt,
    });
    const storage = {
      upload: jest.fn().mockResolvedValue({ provider: "dagshub", uri: "https://dagshub.example/artifact", path: "coverit/app1/run-1/Feature-Scenario/run.webm" }),
      read: jest.fn(),
      publicUrl: jest.fn(),
    };

    const res = await svc.uploadArtifact("key", "run-1", {
      applicationId: "app1",
      scenarioKey: "Feature::Scenario",
      featureName: "Feature",
      scenarioName: "Scenario",
      kind: "video",
      name: "run.webm",
      relativePath: "videos/run.webm",
      contentType: "video/webm",
      metadata: "{\"relativePath\":\"videos/run.webm\"}",
    }, { buffer: Buffer.from("video"), originalName: "run.webm", contentType: "video/webm", size: 5 }, storage);

    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ content: Buffer.from("video") }));
    expect((prisma as any).regressionArtifact.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ kind: "VIDEO", uploadStatus: "UPLOADED", storageProvider: "dagshub" }),
    }));
    expect(res.artifact).toEqual(expect.objectContaining({ kind: "video", uploadStatus: "uploaded", storageProvider: "dagshub" }));
  });

  test("uploadArtifact - persists failed artifact when storage upload fails", async () => {
    const createdAt = new Date("2026-06-13T22:18:20.073Z");
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.upsert.mockResolvedValue({ id: "run-db-1" });
    (prisma as any).regressionArtifact.create.mockResolvedValue({
      id: "artifact1",
      runDbId: "run-db-1",
      scenarioId: null,
      kind: "TRACE",
      name: "trace.zip",
      data: {},
      contentType: "application/zip",
      sizeBytes: BigInt(3),
      storageProvider: "dagshub",
      storagePath: "coverit/app1/run-1/run/trace.zip",
      checksumSha256: "hash",
      uploadStatus: "FAILED",
      uploadError: "network down",
      metadata: {},
      createdAt,
      updatedAt: createdAt,
    });
    const storage = {
      upload: jest.fn().mockRejectedValue(new Error("network down")),
      read: jest.fn(),
      publicUrl: jest.fn(),
    };

    const res = await svc.uploadArtifact("key", "run-1", {
      applicationId: "app1",
      kind: "trace",
      name: "trace.zip",
      relativePath: "trace.zip",
    }, { buffer: Buffer.from("zip"), originalName: "trace.zip", contentType: "application/zip", size: 3 }, storage);

    expect((prisma as any).regressionArtifact.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ kind: "TRACE", uploadStatus: "FAILED", uploadError: "network down" }),
    }));
    expect(res.artifact).toEqual(expect.objectContaining({ uploadStatus: "failed", uploadError: "network down" }));
  });

  test("listArtifacts - filters by kind scenario and upload status", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue({ id: "run-db-1" });
    (prisma as any).regressionArtifact.findMany.mockResolvedValue([]);

    await svc.listArtifacts("p1", "app1", "run-1", { kind: "video", scenarioId: "scenario1", uploadStatus: "uploaded" });

    expect((prisma as any).regressionArtifact.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { runDbId: "run-db-1", kind: "VIDEO", scenarioId: "scenario1", uploadStatus: "UPLOADED" },
    }));
  });

  test("listArtifacts - returns nested artifact tree with folder aggregates", async () => {
    const createdAt = new Date("2026-06-13T22:18:20.073Z");
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue({ id: "run-db-1" });
    (prisma as any).regressionArtifact.findMany.mockResolvedValue([
      {
        id: "artifact-root",
        runDbId: "run-db-1",
        scenarioId: null,
        kind: "SUMMARY",
        name: "summary.json",
        data: {},
        sizeBytes: BigInt(5),
        metadata: { relativePath: "summary.json" },
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "artifact-shot",
        runDbId: "run-db-1",
        scenarioId: "scenario1",
        kind: "SCREENSHOT",
        name: "screenshot.png",
        data: {},
        sizeBytes: BigInt(10),
        metadata: { relativePath: "playwright/scenario_1/screenshot.png" },
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "artifact-trace",
        runDbId: "run-db-1",
        scenarioId: "scenario1",
        kind: "TRACE",
        name: "trace.zip",
        data: {},
        sizeBytes: BigInt(20),
        metadata: { relativePath: "playwright/scenario_1/trace.zip" },
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const res = await svc.listArtifacts("p1", "app1", "run-1", {});

    expect(res.artifacts).toHaveLength(3);
    expect(res.artifactTree).toEqual([
      expect.objectContaining({
        id: "folder:playwright",
        name: "playwright",
        type: "folder",
        artifactCount: 2,
        sizeBytes: 30,
        children: [
          expect.objectContaining({
            id: "folder:playwright/scenario_1",
            artifactCount: 2,
            sizeBytes: 30,
            children: [
              expect.objectContaining({ id: "artifact:artifact-shot", type: "file", path: "playwright/scenario_1/screenshot.png" }),
              expect.objectContaining({ id: "artifact:artifact-trace", type: "file", path: "playwright/scenario_1/trace.zip" }),
            ],
          }),
        ],
      }),
      expect.objectContaining({ id: "artifact:artifact-root", type: "file", path: "summary.json" }),
    ]);
  });

  test("listScenarioArtifacts - returns scenario-scoped artifact tree", async () => {
    const createdAt = new Date("2026-06-13T22:18:20.073Z");
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue({ id: "run-db-1" });
    (prisma as any).regressionScenario.findFirst.mockResolvedValue({ id: "scenario1", runDbId: "run-db-1" });
    (prisma as any).regressionArtifact.findMany.mockResolvedValue([
      {
        id: "artifact-shot",
        runDbId: "run-db-1",
        scenarioId: "scenario1",
        kind: "SCREENSHOT",
        name: "screenshot.png",
        data: {},
        sizeBytes: BigInt(10),
        metadata: { relativePath: "playwright/scenario_1/screenshot.png" },
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const res = await svc.listScenarioArtifacts("p1", "app1", "run-1", "scenario1", {});

    expect((prisma as any).regressionArtifact.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { runDbId: "run-db-1", scenarioId: "scenario1" },
    }));
    expect(res.artifactTree).toEqual([
      expect.objectContaining({
        id: "folder:playwright",
        artifactCount: 1,
        children: [
          expect.objectContaining({
            id: "folder:playwright/scenario_1",
            artifactCount: 1,
            children: [expect.objectContaining({ id: "artifact:artifact-shot" })],
          }),
        ],
      }),
    ]);
  });
});
