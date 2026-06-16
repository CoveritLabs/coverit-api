// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { REGRESSION_RUN_MESSAGES } from "@constants/messages";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@utils/errors";
import { hashToken } from "@utils/token";
import { createHash } from "crypto";
import { env } from "@config/env";
import { artifactStorage } from "@services/artifactStorage.service";
import type { ArtifactStorage } from "@models/artifactStorage";
import type {
  RegressionArtifactListQuery,
  RegressionArtifactUploadFields,
  RegressionEventInput,
  RegressionEventListQuery,
  RegressionRunListQuery,
} from "@models/regressionRun";

type AppContext = { id: string; projectId: string };
type SummaryInput = Record<string, any>;
type ArtifactFileInput = { buffer: Buffer; originalName: string; contentType?: string; size: number };

export async function authenticateApplicationApiKey(apiKey?: string | string[]): Promise<AppContext> {
  const key = Array.isArray(apiKey) ? apiKey[0] : apiKey;
  if (!key) throw new UnauthorizedError(REGRESSION_RUN_MESSAGES.API_KEY_REQUIRED);

  const app = await (prisma as any).targetApplication.findUnique({ where: { apiKeyHash: hashToken(key) } });
  if (!app) throw new UnauthorizedError(REGRESSION_RUN_MESSAGES.API_KEY_INVALID);
  return { id: app.id, projectId: app.projectId };
}

export async function ingestEvents(apiKey: string | string[] | undefined, pathRunId: string, body: RegressionEventInput | { events: RegressionEventInput[] }) {
  const app = await authenticateApplicationApiKey(apiKey);
  const events: RegressionEventInput[] = Array.isArray((body as any).events) ? (body as any).events : [body as RegressionEventInput];

  for (const event of events) {
    await ingestEvent(app, pathRunId, event);
  }

  return { message: events.length === 1 ? REGRESSION_RUN_MESSAGES.EVENT_STORED : REGRESSION_RUN_MESSAGES.EVENTS_STORED };
}

export async function completeRun(apiKey: string | string[] | undefined, pathRunId: string, body: SummaryInput) {
  const app = await authenticateApplicationApiKey(apiKey);
  const summary = body.summary ?? body;
  const applicationId = body.applicationId ?? summary.applicationId;
  const versionId = body.versionId ?? summary.versionId;
  assertApplicationMatch(app, applicationId);
  await assertVersion(app.id, versionId);

  const run = await upsertRun(app.id, pathRunId, versionId, {
    status: toDbRunStatus(summary.status ?? "passed"),
    startedAt: parseDate(summary.startedAt),
    finishedAt: parseDate(summary.finishedAt),
    durationMs: summary.durationMs,
    passedCount: summary.totals?.passed ?? 0,
    failedCount: summary.totals?.failed ?? 0,
    warningCount: summary.totals?.warnings ?? 0,
    summary,
  });

  await (prisma as any).regressionArtifact.create({
    data: {
      runDbId: run.id,
      kind: "SUMMARY",
      name: "runner-summary",
      data: summary,
      metadata: {},
    },
  });

  return { message: REGRESSION_RUN_MESSAGES.RUN_COMPLETED };
}

export async function listRuns(projectId: string, appId: string, query: RegressionRunListQuery) {
  await requireApplication(projectId, appId);
  const where: any = { targetApplicationId: appId };
  if (query.versionId) where.versionId = query.versionId;
  if (query.status) where.status = toDbRunStatus(query.status);
  if (query.cursor) where.createdAt = { lt: new Date(query.cursor) };

  const rows = await (prisma as any).regressionRun.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: query.limit + 1,
  });
  const page = rows.slice(0, query.limit);

  return {
    runs: page.map(mapRun),
    nextCursor: rows.length > query.limit ? page[page.length - 1]?.createdAt.toISOString() : undefined,
  };
}

export async function getRun(projectId: string, appId: string, runId: string) {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  return mapRun(run);
}

export async function listScenarios(projectId: string, appId: string, runId: string) {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const scenarios = await (prisma as any).regressionScenario.findMany({ where: { runDbId: run.id }, orderBy: { createdAt: "asc" } });
  return scenarios.map(mapScenario);
}

export async function getScenario(projectId: string, appId: string, runId: string, scenarioId: string) {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const scenario = await (prisma as any).regressionScenario.findFirst({ where: { id: scenarioId, runDbId: run.id } });
  if (!scenario) throw new NotFoundError(REGRESSION_RUN_MESSAGES.SCENARIO_NOT_FOUND);
  return mapScenario(scenario);
}

export async function listScenarioEvents(projectId: string, appId: string, runId: string, scenarioId: string, query: RegressionEventListQuery) {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const scenario = await (prisma as any).regressionScenario.findFirst({ where: { id: scenarioId, runDbId: run.id } });
  if (!scenario) throw new NotFoundError(REGRESSION_RUN_MESSAGES.SCENARIO_NOT_FOUND);

  const where: any = { scenarioId };
  if (query.type) where.type = query.type;
  if (query.cursor) where.timestamp = { gt: new Date(query.cursor) };
  const rows = await (prisma as any).regressionEvent.findMany({ where, orderBy: { timestamp: "asc" }, take: query.limit + 1 });
  const page = rows.slice(0, query.limit);
  return {
    events: page.map(mapEvent),
    nextCursor: rows.length > query.limit ? page[page.length - 1]?.timestamp.toISOString() : undefined,
  };
}

export async function uploadArtifact(
  apiKey: string | string[] | undefined,
  pathRunId: string,
  fields: RegressionArtifactUploadFields,
  file: ArtifactFileInput,
  storage: ArtifactStorage = artifactStorage,
) {
  if (!file?.buffer?.length) throw new BadRequestError(REGRESSION_RUN_MESSAGES.ARTIFACT_FILE_REQUIRED);

  const app = await authenticateApplicationApiKey(apiKey);
  assertApplicationMatch(app, fields.applicationId);
  await assertVersion(app.id, fields.versionId);

  const run = await upsertRun(app.id, pathRunId, fields.versionId, {});
  const scenario = await upsertArtifactScenario(run.id, fields);
  const metadata = parseMetadata(fields.metadata);
  const checksumSha256 = createHash("sha256").update(file.buffer).digest("hex");
  const storagePath = buildStoragePath(app.id, pathRunId, scenario?.scenarioKey, fields.relativePath || file.originalName);
  const contentType = fields.contentType || file.contentType || "application/octet-stream";

  try {
    const uploaded = await storage.upload({ path: storagePath, content: file.buffer, contentType });
    const artifact = await (prisma as any).regressionArtifact.create({
      data: {
        runDbId: run.id,
        scenarioId: scenario?.id,
        kind: toDbArtifactKind(fields.kind),
        name: fields.name,
        data: {},
        contentType,
        sizeBytes: BigInt(file.size),
        storageProvider: uploaded.provider,
        storageUri: uploaded.uri,
        storagePath: uploaded.path,
        checksumSha256,
        uploadStatus: "UPLOADED",
        metadata,
      },
    });
    return { message: REGRESSION_RUN_MESSAGES.ARTIFACT_STORED, artifact: mapArtifact(artifact) };
  } catch (error) {
    const artifact = await (prisma as any).regressionArtifact.create({
      data: {
        runDbId: run.id,
        scenarioId: scenario?.id,
        kind: toDbArtifactKind(fields.kind),
        name: fields.name,
        data: {},
        contentType,
        sizeBytes: BigInt(file.size),
        storageProvider: "dagshub",
        storagePath,
        checksumSha256,
        uploadStatus: "FAILED",
        uploadError: (error as Error).message,
        metadata,
      },
    });
    return { message: REGRESSION_RUN_MESSAGES.ARTIFACT_STORED, artifact: mapArtifact(artifact) };
  }
}

export async function listArtifacts(projectId: string, appId: string, runId: string, query: RegressionArtifactListQuery = {}) {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const where: any = { runDbId: run.id };
  if (query.kind) where.kind = toDbArtifactKind(query.kind);
  if (query.scenarioId) where.scenarioId = query.scenarioId;
  if (query.uploadStatus) where.uploadStatus = toDbUploadStatus(query.uploadStatus);
  const artifacts = await (prisma as any).regressionArtifact.findMany({ where, orderBy: { createdAt: "asc" } });
  return artifacts.map(mapArtifact);
}

export async function listScenarioArtifacts(projectId: string, appId: string, runId: string, scenarioId: string, query: RegressionArtifactListQuery = {}) {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const scenario = await (prisma as any).regressionScenario.findFirst({ where: { id: scenarioId, runDbId: run.id } });
  if (!scenario) throw new NotFoundError(REGRESSION_RUN_MESSAGES.SCENARIO_NOT_FOUND);
  const artifacts = await listArtifacts(projectId, appId, runId, { ...query, scenarioId });
  return artifacts;
}

export async function getArtifact(projectId: string, appId: string, runId: string, artifactId: string) {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const artifact = await (prisma as any).regressionArtifact.findFirst({ where: { id: artifactId, runDbId: run.id } });
  if (!artifact) throw new NotFoundError(REGRESSION_RUN_MESSAGES.ARTIFACT_NOT_FOUND);
  return mapArtifact(artifact);
}

export async function downloadArtifact(projectId: string, appId: string, runId: string, artifactId: string, storage: ArtifactStorage = artifactStorage) {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const artifact = await (prisma as any).regressionArtifact.findFirst({ where: { id: artifactId, runDbId: run.id } });
  if (!artifact) throw new NotFoundError(REGRESSION_RUN_MESSAGES.ARTIFACT_NOT_FOUND);
  if (!artifact.storagePath || artifact.uploadStatus !== "UPLOADED") throw new NotFoundError(REGRESSION_RUN_MESSAGES.ARTIFACT_NOT_FOUND);
  const stored = await storage.read(artifact.storagePath);
  return {
    content: stored.content,
    contentType: stored.contentType ?? artifact.contentType ?? "application/octet-stream",
    name: artifact.name,
  };
}

async function ingestEvent(app: AppContext, pathRunId: string, event: RegressionEventInput) {
  if (event.runId !== pathRunId) throw new BadRequestError(REGRESSION_RUN_MESSAGES.RUN_NOT_FOUND);
  assertApplicationMatch(app, event.applicationId);
  await assertVersion(app.id, event.versionId);

  const run = await upsertRun(app.id, pathRunId, event.versionId, {});
  const extracted = extractEvent(event);
  const scenario = await upsertScenario(run.id, event, extracted);

  let createdEvent = false;
  try {
    await (prisma as any).regressionEvent.create({
      data: {
        id: event.id,
        runDbId: run.id,
        scenarioId: scenario?.id,
        type: event.type,
        timestamp: new Date(event.timestamp),
        featureName: event.featureName,
        scenarioName: event.scenarioName,
        stepId: extracted.stepId,
        stepLabel: extracted.stepLabel,
        stepType: extracted.stepType,
        status: extracted.status,
        logLevel: extracted.logLevel,
        hasFailure: extracted.hasFailure,
        hasHealing: extracted.hasHealing,
        payload: event.payload ?? {},
        raw: event,
      },
    });
    createdEvent = true;
  } catch (err: any) {
    if (err?.code !== "P2002") throw err;
  }

  if (!createdEvent) return;

  await updateScenarioCounts(scenario?.id);
  await updateRunCounts(run.id);

  if (event.type === "failure") {
    await (prisma as any).regressionArtifact.create({
      data: { runDbId: run.id, scenarioId: scenario?.id, kind: "FAILURE", name: event.id, data: event.payload ?? {}, metadata: {} },
    });
  }
  if (extracted.hasHealing) {
    await (prisma as any).regressionArtifact.create({
      data: { runDbId: run.id, scenarioId: scenario?.id, kind: "HEALING", name: event.id, data: event.payload ?? {}, metadata: {} },
    });
  }
}

async function requireApplication(projectId: string, appId: string) {
  const app = await (prisma as any).targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(REGRESSION_RUN_MESSAGES.APPLICATION_MISMATCH);
  return app;
}

async function findRunByPublicId(appId: string, runId: string) {
  const run = await (prisma as any).regressionRun.findUnique({ where: { targetApplicationId_runId: { targetApplicationId: appId, runId } } });
  if (!run) throw new NotFoundError(REGRESSION_RUN_MESSAGES.RUN_NOT_FOUND);
  return run;
}

async function upsertRun(appId: string, runId: string, versionId: string | undefined, data: Record<string, any>) {
  return (prisma as any).regressionRun.upsert({
    where: { targetApplicationId_runId: { targetApplicationId: appId, runId } },
    create: { targetApplicationId: appId, runId, versionId, ...data },
    update: { versionId, ...data },
  });
}

async function upsertScenario(runDbId: string, event: RegressionEventInput, extracted: ReturnType<typeof extractEvent>) {
  const payload = asRecord(event.payload);
  const scenarioKey = scenarioKeyFor(event, payload);
  if (!scenarioKey) return undefined;

  const status = event.type === "scenario.status" ? toDbScenarioStatus(String(payload.status ?? "running")) : undefined;
  return (prisma as any).regressionScenario.upsert({
    where: { runDbId_scenarioKey: { runDbId, scenarioKey } },
    create: {
      runDbId,
      scenarioKey,
      featureName: event.featureName,
      scenarioName: event.scenarioName,
      title: stringValue(payload.title) ?? event.scenarioName,
      file: stringValue(payload.file),
      line: numberValue(payload.line),
      status: status ?? "RUNNING",
      startedAt: status === "RUNNING" ? new Date(event.timestamp) : undefined,
      finishedAt: status && status !== "RUNNING" ? new Date(event.timestamp) : undefined,
      durationMs: numberValue(payload.durationMs),
    },
    update: {
      featureName: event.featureName,
      scenarioName: event.scenarioName,
      title: stringValue(payload.title) ?? event.scenarioName,
      file: stringValue(payload.file),
      line: numberValue(payload.line),
      status,
      finishedAt: status && status !== "RUNNING" ? new Date(event.timestamp) : undefined,
      durationMs: numberValue(payload.durationMs),
    },
  });
}

async function upsertArtifactScenario(runDbId: string, fields: RegressionArtifactUploadFields) {
  const scenarioKey = fields.scenarioKey?.trim();
  if (!scenarioKey) return undefined;
  return (prisma as any).regressionScenario.upsert({
    where: { runDbId_scenarioKey: { runDbId, scenarioKey } },
    create: {
      runDbId,
      scenarioKey,
      featureName: fields.featureName,
      scenarioName: fields.scenarioName,
      title: fields.scenarioName,
      status: "RUNNING",
    },
    update: {
      featureName: fields.featureName,
      scenarioName: fields.scenarioName,
      title: fields.scenarioName,
    },
  });
}

async function assertVersion(appId: string, versionId?: string) {
  if (!versionId) return;
  const version = await (prisma as any).targetApplicationVersion.findFirst({ where: { id: versionId, targetApplicationId: appId } });
  if (!version) throw new NotFoundError(REGRESSION_RUN_MESSAGES.VERSION_NOT_FOUND);
}

function assertApplicationMatch(app: AppContext, applicationId?: string) {
  if (!applicationId) throw new BadRequestError(REGRESSION_RUN_MESSAGES.APPLICATION_REQUIRED);
  if (applicationId !== app.id) throw new UnauthorizedError(REGRESSION_RUN_MESSAGES.APPLICATION_MISMATCH);
}

function extractEvent(event: RegressionEventInput) {
  const payload = asRecord(event.payload);
  const result = asRecord(payload.result);
  const healingInfo = asRecord(result.healingInfo);
  return {
    stepId: stringValue(payload.stepId),
    stepLabel: stringValue(payload.stepLabel),
    stepType: stringValue(payload.stepType),
    status: stringValue(payload.status),
    logLevel: stringValue(payload.level),
    hasFailure: event.type === "failure" || result.passed === false && result.severity === "blocking",
    hasHealing: Boolean(healingInfo.wasHealed || payload.healed || event.type === "healing.result"),
  };
}

function scenarioKeyFor(event: RegressionEventInput, payload: Record<string, any>) {
  const feature = event.featureName?.trim();
  const scenario = event.scenarioName?.trim();
  const title = stringValue(payload.title)?.trim();
  const file = stringValue(payload.file)?.trim();
  const line = numberValue(payload.line);
  if (feature || scenario) return [feature ?? "", scenario ?? title ?? ""].join("::");
  if (title) return [title, file ?? "", line ?? ""].join("::");
  return undefined;
}

async function updateScenarioCounts(scenarioId?: string) {
  if (!scenarioId) return;
  const events = await (prisma as any).regressionEvent.findMany({ where: { scenarioId, type: "assertion.result" }, select: { payload: true } });
  const counts = countAssertions(events.map((e: any) => asRecord(e.payload).result));
  await (prisma as any).regressionScenario.update({ where: { id: scenarioId }, data: counts });
}

async function updateRunCounts(runDbId: string) {
  const events = await (prisma as any).regressionEvent.findMany({ where: { runDbId, type: "assertion.result" }, select: { payload: true } });
  const counts = countAssertions(events.map((e: any) => asRecord(e.payload).result));
  const failedCount = counts.failedCount;
  await (prisma as any).regressionRun.update({ where: { id: runDbId }, data: { ...counts, status: failedCount > 0 ? "FAILED" : "RUNNING" } });
}

function countAssertions(results: unknown[]) {
  let passedCount = 0;
  let failedCount = 0;
  let warningCount = 0;
  for (const item of results) {
    const result = asRecord(item);
    if (result.severity === "warning") warningCount += 1;
    if (result.passed === true) passedCount += 1;
    if (result.passed === false && result.severity !== "warning") failedCount += 1;
  }
  return { passedCount, failedCount, warningCount };
}

function mapRun(run: any) {
  return {
    id: run.id,
    runId: run.runId,
    applicationId: run.targetApplicationId,
    versionId: run.versionId ?? undefined,
    status: toPublicStatus(run.status),
    startedAt: run.startedAt?.toISOString?.() ?? undefined,
    finishedAt: run.finishedAt?.toISOString?.() ?? undefined,
    durationMs: run.durationMs ?? undefined,
    passedCount: run.passedCount,
    failedCount: run.failedCount,
    warningCount: run.warningCount,
    summary: run.summary ?? undefined,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

function mapScenario(scenario: any) {
  return {
    id: scenario.id,
    runId: scenario.runDbId,
    scenarioKey: scenario.scenarioKey,
    featureName: scenario.featureName ?? undefined,
    scenarioName: scenario.scenarioName ?? undefined,
    title: scenario.title ?? undefined,
    file: scenario.file ?? undefined,
    line: scenario.line ?? undefined,
    status: toPublicStatus(scenario.status),
    startedAt: scenario.startedAt?.toISOString?.() ?? undefined,
    finishedAt: scenario.finishedAt?.toISOString?.() ?? undefined,
    durationMs: scenario.durationMs ?? undefined,
    passedCount: scenario.passedCount,
    failedCount: scenario.failedCount,
    warningCount: scenario.warningCount,
  };
}

function mapEvent(event: any) {
  return {
    id: event.id,
    runId: event.runDbId,
    scenarioId: event.scenarioId ?? undefined,
    type: event.type,
    timestamp: event.timestamp.toISOString(),
    featureName: event.featureName ?? undefined,
    scenarioName: event.scenarioName ?? undefined,
    stepId: event.stepId ?? undefined,
    stepLabel: event.stepLabel ?? undefined,
    stepType: event.stepType ?? undefined,
    status: event.status ?? undefined,
    logLevel: event.logLevel ?? undefined,
    hasFailure: event.hasFailure,
    hasHealing: event.hasHealing,
    payload: event.payload,
  };
}

function mapArtifact(artifact: any) {
  return {
    id: artifact.id,
    runId: artifact.runDbId,
    scenarioId: artifact.scenarioId ?? undefined,
    kind: artifact.kind.toLowerCase(),
    name: artifact.name,
    data: artifact.data,
    contentType: artifact.contentType ?? undefined,
    sizeBytes: artifact.sizeBytes == null ? undefined : Number(artifact.sizeBytes),
    storageProvider: artifact.storageProvider ?? undefined,
    storageUri: artifact.storageUri ?? undefined,
    storagePath: artifact.storagePath ?? undefined,
    checksumSha256: artifact.checksumSha256 ?? undefined,
    uploadStatus: artifact.uploadStatus?.toLowerCase?.() ?? undefined,
    uploadError: artifact.uploadError ?? undefined,
    metadata: artifact.metadata ?? undefined,
    createdAt: artifact.createdAt.toISOString(),
    updatedAt: artifact.updatedAt?.toISOString?.() ?? undefined,
  };
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function parseDate(value: unknown): Date | undefined {
  return typeof value === "string" ? new Date(value) : undefined;
}

function toDbRunStatus(status: string) {
  return status.toUpperCase() === "PASSED" ? "PASSED" : status.toUpperCase() === "FAILED" ? "FAILED" : "RUNNING";
}

function toDbScenarioStatus(status: string) {
  return status.toUpperCase() === "PASSED" ? "PASSED" : status.toUpperCase() === "FAILED" ? "FAILED" : "RUNNING";
}

function toDbArtifactKind(kind: string) {
  const normalized = kind.toUpperCase();
  return ["FAILURE", "LOG", "HEALING", "SUMMARY", "SCREENSHOT", "VIDEO", "TRACE", "EVENTS", "OTHER"].includes(normalized) ? normalized : "OTHER";
}

function toDbUploadStatus(status: string) {
  return status.toUpperCase() === "FAILED" ? "FAILED" : "UPLOADED";
}

function toPublicStatus(status: string) {
  return status.toLowerCase();
}

function parseMetadata(metadata?: string) {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata);
    return asRecord(parsed);
  } catch {
    throw new BadRequestError("artifact metadata must be valid JSON");
  }
}

function buildStoragePath(applicationId: string, runId: string, scenarioKey: string | undefined, relativePath: string) {
  const safeRelativePath = sanitizeRelativePath(relativePath);
  const scenarioSegment = scenarioKey ? sanitizePathSegment(scenarioKey) : "run";
  return [
    sanitizeRelativePath(env.DAGSHUB_ARTIFACT_PREFIX ?? "coverit-regression-artifacts"),
    sanitizePathSegment(applicationId),
    sanitizePathSegment(runId),
    scenarioSegment,
    safeRelativePath,
  ].join("/");
}

function sanitizeRelativePath(value: string) {
  const cleaned = value.replace(/\\/g, "/").split("/").filter(Boolean);
  if (cleaned.length === 0 || cleaned.some((part) => part === "." || part === "..")) {
    throw new BadRequestError(REGRESSION_RUN_MESSAGES.ARTIFACT_PATH_INVALID);
  }
  return cleaned.map(sanitizePathSegment).join("/");
}

function sanitizePathSegment(value: string) {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "artifact";
}
