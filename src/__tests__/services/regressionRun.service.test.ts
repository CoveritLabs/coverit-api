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
    (prisma as any).$executeRawUnsafe = jest.fn();
    (prisma as any).$transaction.mockImplementation((fn: Function) => fn(prisma));
    (prisma as any).targetApplication = {
      findUnique: jest.fn(),
    };
    (prisma as any).targetApplicationVersion = {
      findFirst: jest.fn(),
    };
    (prisma as any).regressionRun = {
      create: jest.fn(),
      findFirst: jest.fn(),
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
    (prisma as any).regressionRun.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: "RUNNING" });
    (prisma as any).regressionRun.findFirst.mockResolvedValue(null);
    (prisma as any).regressionRun.create.mockResolvedValue({ id: "run-db-1", versionId: undefined });
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

    expect((prisma as any).regressionRun.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ targetApplicationId: "app1", runId: "run-1", name: "Run", nameNumber: 1 }),
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

  test("ingestEvents - stores running scenario start time without duration", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValueOnce({ id: "run-db-1", versionId: undefined }).mockResolvedValueOnce({ status: "RUNNING" });
    (prisma as any).regressionScenario.findFirst.mockResolvedValue(null);
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
      featureName: "Feature",
      scenarioName: "Happy path",
      payload: { status: "running", startedAt: "2026-06-13T22:18:20.073Z" },
    } as any);

    const upsertPayload = (prisma as any).regressionScenario.upsert.mock.calls[0][0];
    expect(upsertPayload.create).toEqual(expect.objectContaining({ startedAt: new Date("2026-06-13T22:18:20.073Z") }));
    expect(upsertPayload.update).toEqual(expect.objectContaining({ startedAt: new Date("2026-06-13T22:18:20.073Z") }));
    expect(upsertPayload.create).not.toHaveProperty("durationMs");
    expect(upsertPayload.update).not.toHaveProperty("durationMs");
  });

  test("ingestEvents - stores final scenario duration from timing payload", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValueOnce({ id: "run-db-1", versionId: undefined }).mockResolvedValueOnce({ status: "RUNNING" });
    (prisma as any).regressionScenario.findFirst.mockResolvedValue(null);
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
      featureName: "Feature",
      scenarioName: "Happy path",
      payload: {
        status: "passed",
        startedAt: "2026-06-13T22:18:20.073Z",
        finishedAt: "2026-06-13T22:18:27.073Z",
        durationMs: 7000,
      },
    } as any);

    expect((prisma as any).regressionScenario.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        startedAt: new Date("2026-06-13T22:18:20.073Z"),
        finishedAt: new Date("2026-06-13T22:18:27.073Z"),
        durationMs: 7000,
      }),
      update: expect.objectContaining({
        startedAt: new Date("2026-06-13T22:18:20.073Z"),
        finishedAt: new Date("2026-06-13T22:18:27.073Z"),
        durationMs: 7000,
      }),
    }));
  });

  test("ingestEvents - computes final scenario duration from existing start time", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValueOnce({ id: "run-db-1", versionId: undefined }).mockResolvedValueOnce({ status: "RUNNING" });
    (prisma as any).regressionScenario.findFirst.mockResolvedValue({ startedAt: new Date("2026-06-13T22:18:20.073Z") });
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
      featureName: "Feature",
      scenarioName: "Happy path",
      payload: { status: "failed" },
    } as any);

    expect((prisma as any).regressionScenario.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({
        startedAt: new Date("2026-06-13T22:18:20.073Z"),
        finishedAt: new Date("2026-06-13T22:18:27.073Z"),
        durationMs: 7000,
      }),
    }));
  });

  test("ingestEvents - does not downgrade a completed run to running", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValueOnce({ id: "run-db-1", versionId: undefined }).mockResolvedValueOnce({ status: "PASSED" });
    (prisma as any).regressionRun.update.mockResolvedValue({ id: "run-db-1" });
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

  test("ingestEvents - counts passed self-healed assertions as warnings without failing completed run", async () => {
    const healedResult = {
      passed: true,
      severity: "blocking",
      healingInfo: {
        wasHealed: true,
        originalSelector: "[data-testid='old']",
        healedSelector: "[data-testid='new']",
      },
    };
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique
      .mockResolvedValueOnce({ id: "run-db-1", versionId: undefined })
      .mockResolvedValueOnce({ status: "PASSED" });
    (prisma as any).regressionScenario.upsert.mockResolvedValue({ id: "scenario1" });
    (prisma as any).regressionEvent.create.mockResolvedValue({});
    (prisma as any).regressionEvent.findMany.mockResolvedValue([{ payload: { result: healedResult } }]);
    (prisma as any).regressionRun.update.mockResolvedValue({});
    (prisma as any).regressionScenario.update.mockResolvedValue({});

    await svc.ingestEvents("key", "run-1", {
      id: "event1",
      type: "assertion.result",
      timestamp: "2026-06-13T22:18:27.073Z",
      runId: "run-1",
      applicationId: "app1",
      featureName: "Checkout",
      scenarioName: "Happy path",
      payload: {
        stepId: "assert-total",
        stepLabel: "Assert total",
        stepType: "ASSERTION",
        result: healedResult,
      },
    } as any);

    expect((prisma as any).regressionScenario.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "scenario1" },
      data: { passedCount: 1, failedCount: 0, warningCount: 1 },
    }));
    expect((prisma as any).regressionRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run-db-1" },
      data: { passedCount: 1, failedCount: 0, warningCount: 1, status: "PASSED" },
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

  test("completeRun - stores run summary without data-only artifact", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue(null);
    (prisma as any).regressionRun.findFirst.mockResolvedValue(null);
    (prisma as any).regressionRun.create.mockResolvedValue({ id: "run-db-1" });

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
    expect((prisma as any).regressionRun.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PASSED", passedCount: 2, failedCount: 0, warningCount: 1, name: "Run", nameNumber: 1 }),
    }));
    expect((prisma as any).regressionArtifact.create).not.toHaveBeenCalled();
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
      name: "Run",
      nameNumber: 1,
      passedCount: 2,
      failedCount: 0,
      warningCount: 1,
      createdAt,
      updatedAt: createdAt,
    }]);

    const res = await svc.listRuns("p1", "app1", { versionId: "v1", status: "passed", limit: 25 });

    expect(res.runs).toEqual([expect.objectContaining({ runId: "run-1", status: "passed", versionId: "v1", displayName: "Run" })]);
    expect((prisma as any).regressionRun.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { targetApplicationId: "app1", versionId: "v1", status: "PASSED" },
    }));
  });

  test("completeRun - sequences run names per target application", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue(null);
    (prisma as any).regressionRun.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ nameNumber: 1 })
      .mockResolvedValueOnce({ nameNumber: 2 })
      .mockResolvedValueOnce({ nameNumber: 3 })
      .mockResolvedValueOnce({ nameNumber: 4 })
      .mockResolvedValueOnce({ nameNumber: 5 });
    (prisma as any).regressionRun.create.mockImplementation(({ data }: any) => Promise.resolve({ id: `db-${data.runId}`, ...data }));

    for (let index = 1; index <= 6; index += 1) {
      await svc.completeRun("key", `run-${index}`, {
        applicationId: "app1",
        runName: "Run",
        status: "passed",
        totals: { passed: 0, failed: 0, warnings: 0 },
        reports: [],
      });
    }

    expect((prisma as any).regressionRun.create.mock.calls.map((call: any[]) => call[0].data.nameNumber)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("completeRun - sequences same base names independently by target application", async () => {
    (prisma as any).targetApplication.findUnique
      .mockResolvedValueOnce({ id: "app1", projectId: "p1" })
      .mockResolvedValueOnce({ id: "app2", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue(null);
    (prisma as any).regressionRun.findFirst.mockResolvedValue(null);
    (prisma as any).regressionRun.create.mockImplementation(({ data }: any) => Promise.resolve({ id: `db-${data.targetApplicationId}`, ...data }));

    await svc.completeRun("key", "run-1", { applicationId: "app1", runName: "Run", status: "passed", totals: { passed: 0, failed: 0, warnings: 0 }, reports: [] });
    await svc.completeRun("key", "run-2", { applicationId: "app2", runName: "Run", status: "passed", totals: { passed: 0, failed: 0, warnings: 0 }, reports: [] });

    expect((prisma as any).regressionRun.create.mock.calls.map((call: any[]) => ({
      appId: call[0].data.targetApplicationId,
      nameNumber: call[0].data.nameNumber,
    }))).toEqual([
      { appId: "app1", nameNumber: 1 },
      { appId: "app2", nameNumber: 1 },
    ]);
  });

  test("completeRun - existing run update keeps assigned name and number", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue({
      id: "run-db-1",
      runId: "run-1",
      targetApplicationId: "app1",
      versionId: undefined,
      name: "Run",
      nameNumber: 6,
    });
    (prisma as any).regressionRun.update.mockResolvedValue({ id: "run-db-1", name: "Run", nameNumber: 6 });

    await svc.completeRun("key", "run-1", {
      applicationId: "app1",
      runName: "Renamed",
      status: "passed",
      totals: { passed: 1, failed: 0, warnings: 0 },
      reports: [],
    });

    expect((prisma as any).regressionRun.create).not.toHaveBeenCalled();
    expect((prisma as any).regressionRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run-db-1" },
      data: expect.not.objectContaining({ name: "Renamed", nameNumber: expect.any(Number) }),
    }));
  });

  test("uploadArtifact - stores DagsHub metadata when upload succeeds", async () => {
    const createdAt = new Date("2026-06-13T22:18:20.073Z");
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue(null);
    (prisma as any).regressionRun.findFirst.mockResolvedValue(null);
    (prisma as any).regressionRun.create.mockResolvedValue({ id: "run-db-1" });
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
      deleteApplicationArtifacts: jest.fn(),
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
    (prisma as any).regressionRun.findUnique.mockResolvedValue(null);
    (prisma as any).regressionRun.findFirst.mockResolvedValue(null);
    (prisma as any).regressionRun.create.mockResolvedValue({ id: "run-db-1" });
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
      deleteApplicationArtifacts: jest.fn(),
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
        contentType: "application/json",
        sizeBytes: BigInt(5),
        storageUri: "https://dagshub.example/summary.json",
        storagePath: "coverit/app1/run-1/run/summary.json",
        uploadStatus: "UPLOADED",
        metadata: { relativePath: "summary.json" },
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "artifact-inline-failure",
        runDbId: "run-db-1",
        scenarioId: "scenario1",
        kind: "FAILURE",
        name: "1781729453264-a042dd42",
        data: { message: "inline only" },
        metadata: {},
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
        contentType: "image/png",
        sizeBytes: BigInt(10),
        storageUri: "https://dagshub.example/screenshot.png",
        storagePath: "coverit/app1/run-1/scenario/screenshot.png",
        uploadStatus: "UPLOADED",
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
        contentType: "application/zip",
        sizeBytes: BigInt(20),
        storageUri: "https://dagshub.example/trace.zip",
        storagePath: "coverit/app1/run-1/scenario/trace.zip",
        uploadStatus: "UPLOADED",
        metadata: { relativePath: "playwright/scenario_1/trace.zip" },
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "artifact-failed-video",
        runDbId: "run-db-1",
        scenarioId: "scenario1",
        kind: "VIDEO",
        name: "video.webm",
        data: {},
        contentType: "video/webm",
        sizeBytes: BigInt(30),
        storagePath: "coverit/app1/run-1/scenario/video.webm",
        uploadStatus: "FAILED",
        metadata: { relativePath: "playwright/scenario_1/video.webm" },
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const res = await svc.listArtifacts("p1", "app1", "run-1", {});

    expect(res.artifacts).toHaveLength(3);
    expect(res.artifacts.map((artifact) => artifact.id)).not.toContain("artifact-inline-failure");
    expect(res.artifacts.map((artifact) => artifact.id)).not.toContain("artifact-failed-video");
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

  test("listScenarioArtifacts - returns direct and matching run-level scenario artifact tree", async () => {
    const createdAt = new Date("2026-06-13T22:18:20.073Z");
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).regressionRun.findUnique.mockResolvedValue({ id: "run-db-1" });
    (prisma as any).regressionScenario.findFirst.mockResolvedValue({ id: "scenario1", runDbId: "run-db-1", scenarioName: "Checkout works" });
    (prisma as any).regressionArtifact.findMany.mockResolvedValue([
      {
        id: "artifact-log",
        runDbId: "run-db-1",
        scenarioId: "scenario1",
        kind: "LOG",
        name: "scenario.log",
        data: {},
        contentType: "text/plain",
        sizeBytes: BigInt(8),
        storageUri: "https://dagshub.example/scenario.log",
        storagePath: "coverit/app1/run-1/scenario/scenario.log",
        uploadStatus: "UPLOADED",
        metadata: { relativePath: "playwright/scenarios/Checkout-works/scenario.log" },
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "artifact-run-trace",
        runDbId: "run-db-1",
        scenarioId: null,
        kind: "TRACE",
        name: "trace.zip",
        data: {},
        contentType: "application/zip",
        sizeBytes: BigInt(30),
        storageUri: "https://dagshub.example/trace.zip",
        storagePath: "coverit/app1/run-1/run/trace.zip",
        uploadStatus: "UPLOADED",
        metadata: { relativePath: "playwright/scenarios/Checkout-works/playwright/trace.zip" },
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "artifact-other-video",
        runDbId: "run-db-1",
        scenarioId: null,
        kind: "VIDEO",
        name: "video.webm",
        data: {},
        contentType: "video/webm",
        sizeBytes: BigInt(40),
        storageUri: "https://dagshub.example/video.webm",
        storagePath: "coverit/app1/run-1/run/video.webm",
        uploadStatus: "UPLOADED",
        metadata: { relativePath: "playwright/scenarios/Other-scenario/playwright/video.webm" },
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
        contentType: "image/png",
        sizeBytes: BigInt(10),
        storageUri: "https://dagshub.example/screenshot.png",
        storagePath: "coverit/app1/run-1/scenario/screenshot.png",
        uploadStatus: "UPLOADED",
        metadata: { relativePath: "playwright/scenarios/Checkout-works/screenshot.png" },
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const res = await svc.listScenarioArtifacts("p1", "app1", "run-1", "scenario1", {});

    expect((prisma as any).regressionArtifact.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { runDbId: "run-db-1" },
    }));
    expect(res.artifacts.map((artifact) => artifact.id)).toEqual(["artifact-log", "artifact-run-trace", "artifact-shot"]);
    expect(res.artifacts.map((artifact) => artifact.id)).not.toContain("artifact-other-video");
    expect(res.artifactTree).toEqual([
      expect.objectContaining({
        id: "folder:playwright",
        artifactCount: 3,
        children: [
          expect.objectContaining({
            id: "folder:playwright/scenarios",
            artifactCount: 3,
            children: [
              expect.objectContaining({
                id: "folder:playwright/scenarios/Checkout-works",
                artifactCount: 3,
              }),
            ],
          }),
        ],
      }),
    ]);
  });
});
