// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { REGRESSION_RUN_MESSAGES } from "@constants/messages";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@utils/errors";
import { hashToken } from "@utils/token";
import { createHash } from "crypto";
import { artifactStorage } from "@services/artifactStorage.service";
import { ARTIFACT_STORAGE } from "@constants/artifactStorage";
import {
  buildRegressionArtifactTree,
  mapRegressionArtifact,
  mapRegressionEvent,
  mapRegressionRun,
  mapRegressionScenario,
  toDbArtifactKind,
  toDbRunStatus,
  toDbScenarioStatus,
  toDbUploadStatus,
} from "@mappers/regressionRun.mapper";
import type { DbRegressionScenarioStatus } from "@mappers/regressionRun.mapper";
import { buildArtifactStoragePath, parseArtifactMetadata } from "@utils/regressionArtifact";
import type { MessageResponse } from "@models/common";
import type { ArtifactStorage } from "@models/artifactStorage";
import type {
  ExtractedRegressionEvent,
  ListRegressionArtifactsResponse,
  ListRegressionEventsResponse,
  ListRegressionRunsResponse,
  RegressionArtifactDownloadResponse,
  RegressionArtifactListQuery,
  RegressionArtifactResponse,
  RegressionArtifactUploadResponse,
  RegressionArtifactUploadFields,
  RegressionEventInput,
  RegressionEventListQuery,
  RegressionRunResponse,
  RegressionRunListQuery,
  RegressionScenarioResponse,
} from "@models/regressionRun";

type AppContext = { id: string; projectId: string };
type SummaryInput = Record<string, any>;
type ArtifactFileInput = { buffer: Buffer; originalName: string; contentType?: string; size: number };
const DEFAULT_RUN_NAME = "Run";

export async function authenticateApplicationApiKey(apiKey?: string | string[]): Promise<AppContext> {
  const key = Array.isArray(apiKey) ? apiKey[0] : apiKey;
  if (!key) throw new UnauthorizedError(REGRESSION_RUN_MESSAGES.API_KEY_REQUIRED);

  const app = await (prisma as any).targetApplication.findUnique({ where: { apiKeyHash: hashToken(key) } });
  if (!app) throw new UnauthorizedError(REGRESSION_RUN_MESSAGES.API_KEY_INVALID);
  return { id: app.id, projectId: app.projectId };
}

export async function ingestEvents(
  apiKey: string | string[] | undefined,
  pathRunId: string,
  body: RegressionEventInput | { events: RegressionEventInput[] },
): Promise<MessageResponse> {
  const app = await authenticateApplicationApiKey(apiKey);
  const events: RegressionEventInput[] = Array.isArray((body as any).events) ? (body as any).events : [body as RegressionEventInput];

  for (const event of events) {
    await ingestEvent(app, pathRunId, event);
  }

  return { message: events.length === 1 ? REGRESSION_RUN_MESSAGES.EVENT_STORED : REGRESSION_RUN_MESSAGES.EVENTS_STORED };
}

export async function completeRun(apiKey: string | string[] | undefined, pathRunId: string, body: SummaryInput): Promise<MessageResponse> {
  const app = await authenticateApplicationApiKey(apiKey);
  const summary = body.summary ?? body;
  const applicationId = body.applicationId ?? summary.applicationId;
  const versionId = body.versionId ?? summary.versionId;
  assertApplicationMatch(app, applicationId);
  await assertVersion(app.id, versionId);

  const run = await findOrCreateRun(app.id, pathRunId, versionId, body.runName ?? summary.runName, {
    status: toDbRunStatus(summary.status ?? "passed"),
    startedAt: parseDate(summary.startedAt),
    finishedAt: parseDate(summary.finishedAt),
    durationMs: summary.durationMs,
    passedCount: summary.totals?.passed ?? 0,
    failedCount: summary.totals?.failed ?? 0,
    warningCount: summary.totals?.warnings ?? 0,
    summary,
  });

  return { message: REGRESSION_RUN_MESSAGES.RUN_COMPLETED };
}

export async function listRuns(projectId: string, appId: string, query: RegressionRunListQuery): Promise<ListRegressionRunsResponse> {
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
    runs: page.map(mapRegressionRun),
    nextCursor: rows.length > query.limit ? page[page.length - 1]?.createdAt.toISOString() : undefined,
  };
}

export async function getRun(projectId: string, appId: string, runId: string): Promise<RegressionRunResponse> {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  return mapRegressionRun(run);
}

export async function listScenarios(projectId: string, appId: string, runId: string): Promise<RegressionScenarioResponse[]> {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const scenarios = await (prisma as any).regressionScenario.findMany({
    where: { runDbId: run.id },
    orderBy: { createdAt: "asc" },
    include: { integrationReports: { orderBy: { createdAt: "asc" } } },
  });
  return scenarios.map(mapRegressionScenario);
}

export async function getScenario(projectId: string, appId: string, runId: string, scenarioId: string): Promise<RegressionScenarioResponse> {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const scenario = await (prisma as any).regressionScenario.findFirst({
    where: { id: scenarioId, runDbId: run.id },
    include: { integrationReports: { orderBy: { createdAt: "asc" } } },
  });
  if (!scenario) throw new NotFoundError(REGRESSION_RUN_MESSAGES.SCENARIO_NOT_FOUND);
  return mapRegressionScenario(scenario);
}

export async function listScenarioEvents(
  projectId: string,
  appId: string,
  runId: string,
  scenarioId: string,
  query: RegressionEventListQuery,
): Promise<ListRegressionEventsResponse> {
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
    events: page.map(mapRegressionEvent),
    nextCursor: rows.length > query.limit ? page[page.length - 1]?.timestamp.toISOString() : undefined,
  };
}

export async function uploadArtifact(
  apiKey: string | string[] | undefined,
  pathRunId: string,
  fields: RegressionArtifactUploadFields,
  file: ArtifactFileInput,
  storage: ArtifactStorage = artifactStorage,
): Promise<RegressionArtifactUploadResponse> {
  if (!file?.buffer?.length) throw new BadRequestError(REGRESSION_RUN_MESSAGES.ARTIFACT_FILE_REQUIRED);

  const app = await authenticateApplicationApiKey(apiKey);
  assertApplicationMatch(app, fields.applicationId);
  await assertVersion(app.id, fields.versionId);

  const run = await findOrCreateRun(app.id, pathRunId, fields.versionId, fields.runName, {});
  const scenario = await upsertArtifactScenario(run.id, fields);
  const metadata = parseArtifactMetadata(fields.metadata);
  const checksumSha256 = createHash("sha256").update(file.buffer).digest("hex");
  const storagePath = buildArtifactStoragePath(app.id, pathRunId, scenario?.scenarioKey, fields.relativePath || file.originalName);
  const contentType = fields.contentType || file.contentType || ARTIFACT_STORAGE.DEFAULT_CONTENT_TYPE;

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
    return { message: REGRESSION_RUN_MESSAGES.ARTIFACT_STORED, artifact: mapRegressionArtifact(artifact) };
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
        storageProvider: ARTIFACT_STORAGE.DAGSHUB_FAILED_PROVIDER,
        storagePath,
        checksumSha256,
        uploadStatus: "FAILED",
        uploadError: (error as Error).message,
        metadata,
      },
    });
    return { message: REGRESSION_RUN_MESSAGES.ARTIFACT_STORED, artifact: mapRegressionArtifact(artifact) };
  }
}

export async function listArtifacts(
  projectId: string,
  appId: string,
  runId: string,
  query: RegressionArtifactListQuery = {},
): Promise<ListRegressionArtifactsResponse> {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const where: any = { runDbId: run.id };
  if (query.kind) where.kind = toDbArtifactKind(query.kind);
  if (query.scenarioId) where.scenarioId = query.scenarioId;
  if (query.uploadStatus) where.uploadStatus = toDbUploadStatus(query.uploadStatus);
  const artifacts = await (prisma as any).regressionArtifact.findMany({ where, orderBy: { createdAt: "asc" } });
  const mappedArtifacts = artifacts.map(mapRegressionArtifact).filter(isDownloadableArtifact);
  return {
    artifacts: mappedArtifacts,
    artifactTree: buildRegressionArtifactTree(mappedArtifacts),
  };
}

export async function listScenarioArtifacts(
  projectId: string,
  appId: string,
  runId: string,
  scenarioId: string,
  query: RegressionArtifactListQuery = {},
): Promise<ListRegressionArtifactsResponse> {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const scenario = await (prisma as any).regressionScenario.findFirst({ where: { id: scenarioId, runDbId: run.id } });
  if (!scenario) throw new NotFoundError(REGRESSION_RUN_MESSAGES.SCENARIO_NOT_FOUND);

  const where: any = { runDbId: run.id };
  if (query.kind) where.kind = toDbArtifactKind(query.kind);
  if (query.uploadStatus) where.uploadStatus = toDbUploadStatus(query.uploadStatus);
  const artifacts = await (prisma as any).regressionArtifact.findMany({ where, orderBy: { createdAt: "asc" } });
  const mappedArtifacts = artifacts.map(mapRegressionArtifact).filter(isDownloadableArtifact);
  const scenarioArtifacts = selectScenarioArtifacts(mappedArtifacts, scenarioId, scenario);
  return {
    artifacts: scenarioArtifacts,
    artifactTree: buildRegressionArtifactTree(scenarioArtifacts),
  };
}

export async function getArtifact(projectId: string, appId: string, runId: string, artifactId: string): Promise<RegressionArtifactResponse> {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const artifact = await (prisma as any).regressionArtifact.findFirst({ where: { id: artifactId, runDbId: run.id } });
  if (!artifact) throw new NotFoundError(REGRESSION_RUN_MESSAGES.ARTIFACT_NOT_FOUND);
  const mapped = mapRegressionArtifact(artifact);
  if (!isDownloadableArtifact(mapped)) throw new NotFoundError(REGRESSION_RUN_MESSAGES.ARTIFACT_NOT_FOUND);
  return mapped;
}

export async function downloadArtifact(
  projectId: string,
  appId: string,
  runId: string,
  artifactId: string,
  storage: ArtifactStorage = artifactStorage,
): Promise<RegressionArtifactDownloadResponse> {
  await requireApplication(projectId, appId);
  const run = await findRunByPublicId(appId, runId);
  const artifact = await (prisma as any).regressionArtifact.findFirst({ where: { id: artifactId, runDbId: run.id } });
  if (!artifact) throw new NotFoundError(REGRESSION_RUN_MESSAGES.ARTIFACT_NOT_FOUND);
  if (!isDownloadableArtifact(mapRegressionArtifact(artifact))) throw new NotFoundError(REGRESSION_RUN_MESSAGES.ARTIFACT_NOT_FOUND);
  const stored = await storage.read(artifact.storagePath);
  return {
    content: stored.content,
    contentType: stored.contentType ?? artifact.contentType ?? ARTIFACT_STORAGE.DEFAULT_CONTENT_TYPE,
    name: artifact.name,
  };
}

async function ingestEvent(app: AppContext, pathRunId: string, event: RegressionEventInput): Promise<void> {
  if (event.runId !== pathRunId) throw new BadRequestError(REGRESSION_RUN_MESSAGES.RUN_NOT_FOUND);
  assertApplicationMatch(app, event.applicationId);
  await assertVersion(app.id, event.versionId);

  const run = await findOrCreateRun(app.id, pathRunId, event.versionId, event.runName, {});
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

}

async function requireApplication(projectId: string, appId: string): Promise<any> {
  const app = await (prisma as any).targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(REGRESSION_RUN_MESSAGES.APPLICATION_MISMATCH);
  return app;
}

async function findRunByPublicId(appId: string, runId: string): Promise<any> {
  const run = await (prisma as any).regressionRun.findUnique({ where: { targetApplicationId_runId: { targetApplicationId: appId, runId } } });
  if (!run) throw new NotFoundError(REGRESSION_RUN_MESSAGES.RUN_NOT_FOUND);
  return run;
}

async function findOrCreateRun(appId: string, runId: string, versionId: string | undefined, runName: string | undefined, data: Record<string, any>): Promise<any> {
  const existing = await (prisma as any).regressionRun.findUnique({ where: { targetApplicationId_runId: { targetApplicationId: appId, runId } } });
  if (existing) {
    if (Object.keys(data).length === 0 && versionId === existing.versionId) return existing;
    return (prisma as any).regressionRun.update({
      where: { id: existing.id },
      data: { versionId, ...data },
    });
  }

  const name = normalizeRunName(runName);
  return (prisma as any).$transaction(async (tx: any) => {
    await lockRunNameSequence(tx, appId, name);
    const latest = await tx.regressionRun.findFirst({
      where: { targetApplicationId: appId, name },
      orderBy: { nameNumber: "desc" },
      select: { nameNumber: true },
    });
    return tx.regressionRun.create({
      data: {
        targetApplicationId: appId,
        runId,
        versionId,
        name,
        nameNumber: (latest?.nameNumber ?? 0) + 1,
        ...data,
      },
    });
  });
}

async function lockRunNameSequence(tx: any, appId: string, name: string): Promise<void> {
  const lockKey = `regression-run-name:${appId}:${name}`;
  if (typeof tx.$executeRawUnsafe !== "function") return;
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", lockKey);
}

function normalizeRunName(name?: string): string {
  const normalized = name?.trim().replace(/\s+/g, " ");
  return normalized || DEFAULT_RUN_NAME;
}

async function upsertScenario(runDbId: string, event: RegressionEventInput, extracted: ExtractedRegressionEvent): Promise<any | undefined> {
  const payload = asRecord(event.payload);
  const scenarioKey = scenarioKeyFor(event, payload);
  if (!scenarioKey) return undefined;

  const status = event.type === "scenario.status" ? toDbScenarioStatus(String(payload.status ?? "running")) : undefined;
  const scenarioTiming = await getScenarioTiming(runDbId, scenarioKey, event, payload, status);
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
      ...scenarioTiming.create,
    },
    update: {
      featureName: event.featureName,
      scenarioName: event.scenarioName,
      title: stringValue(payload.title) ?? event.scenarioName,
      file: stringValue(payload.file),
      line: numberValue(payload.line),
      status,
      ...scenarioTiming.update,
    },
  });
}

async function getScenarioTiming(
  runDbId: string,
  scenarioKey: string,
  event: RegressionEventInput,
  payload: Record<string, any>,
  status?: DbRegressionScenarioStatus,
): Promise<{ create: Record<string, any>; update: Record<string, any> }> {
  if (!status) return { create: {}, update: {} };

  const eventTimestamp = parseDate(event.timestamp) ?? new Date();
  const payloadStartedAt = parseDate(payload.startedAt);
  const payloadFinishedAt = parseDate(payload.finishedAt);
  const payloadDurationMs = numberValue(payload.durationMs);
  if (status === "RUNNING") {
    const startedAt = payloadStartedAt ?? eventTimestamp;
    return {
      create: { startedAt },
      update: { startedAt },
    };
  }

  const existing = await (prisma as any).regressionScenario.findFirst({
    where: { runDbId, scenarioKey },
    select: { startedAt: true },
  });
  const startedAt = payloadStartedAt ?? existing?.startedAt ?? undefined;
  const finishedAt = payloadFinishedAt ?? eventTimestamp;
  const durationMs = payloadDurationMs ?? durationMsBetween(startedAt, finishedAt);

  return {
    create: {
      startedAt,
      finishedAt,
      durationMs,
    },
    update: {
      ...(startedAt ? { startedAt } : {}),
      finishedAt,
      durationMs,
    },
  };
}

function durationMsBetween(startedAt?: Date, finishedAt?: Date): number | undefined {
  if (!startedAt || !finishedAt) return undefined;
  return Math.max(0, finishedAt.getTime() - startedAt.getTime());
}

async function upsertArtifactScenario(runDbId: string, fields: RegressionArtifactUploadFields): Promise<any | undefined> {
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

async function assertVersion(appId: string, versionId?: string): Promise<void> {
  if (!versionId) return;
  const version = await (prisma as any).targetApplicationVersion.findFirst({ where: { id: versionId, targetApplicationId: appId } });
  if (!version) throw new NotFoundError(REGRESSION_RUN_MESSAGES.VERSION_NOT_FOUND);
}

function assertApplicationMatch(app: AppContext, applicationId?: string): void {
  if (!applicationId) throw new BadRequestError(REGRESSION_RUN_MESSAGES.APPLICATION_REQUIRED);
  if (applicationId !== app.id) throw new UnauthorizedError(REGRESSION_RUN_MESSAGES.APPLICATION_MISMATCH);
}

function extractEvent(event: RegressionEventInput): ExtractedRegressionEvent {
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

function scenarioKeyFor(event: RegressionEventInput, payload: Record<string, any>): string | undefined {
  const feature = event.featureName?.trim();
  const scenario = event.scenarioName?.trim();
  const title = stringValue(payload.title)?.trim();
  const file = stringValue(payload.file)?.trim();
  const line = numberValue(payload.line);
  if (feature || scenario) return [feature ?? "", scenario ?? title ?? ""].join("::");
  if (title) return [title, file ?? "", line ?? ""].join("::");
  return undefined;
}

async function updateScenarioCounts(scenarioId?: string): Promise<void> {
  if (!scenarioId) return;
  const events = await (prisma as any).regressionEvent.findMany({ where: { scenarioId, type: "assertion.result" }, select: { payload: true } });
  const counts = countAssertions(events.map((e: any) => asRecord(e.payload).result));
  await (prisma as any).regressionScenario.update({ where: { id: scenarioId }, data: counts });
}

async function updateRunCounts(runDbId: string): Promise<void> {
  const events = await (prisma as any).regressionEvent.findMany({ where: { runDbId, type: "assertion.result" }, select: { payload: true } });
  const counts = countAssertions(events.map((e: any) => asRecord(e.payload).result));
  const failedCount = counts.failedCount;
  const run = await (prisma as any).regressionRun.findUnique({ where: { id: runDbId }, select: { status: true } });
  const isCompleted = run?.status === "PASSED" || run?.status === "FAILED";
  const status = failedCount > 0 ? "FAILED" : isCompleted ? run.status : "RUNNING";
  await (prisma as any).regressionRun.update({ where: { id: runDbId }, data: { ...counts, status } });
}

function countAssertions(results: unknown[]): { passedCount: number; failedCount: number; warningCount: number } {
  let passedCount = 0;
  let failedCount = 0;
  let warningCount = 0;
  for (const item of results) {
    const result = asRecord(item);
    const healingInfo = asRecord(result.healingInfo);
    if (healingInfo.wasHealed || result.severity === "warning") warningCount += 1;
    if (result.passed === true) passedCount += 1;
    if (result.passed === false && result.severity !== "warning") failedCount += 1;
  }
  return { passedCount, failedCount, warningCount };
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

function isDownloadableArtifact(artifact: RegressionArtifactResponse): boolean {
  return artifact.uploadStatus === "uploaded"
    && Boolean(artifact.storagePath)
    && Boolean(artifact.storageUri)
    && Boolean(artifact.contentType)
    && artifact.sizeBytes != null;
}

function selectScenarioArtifacts(artifacts: RegressionArtifactResponse[], scenarioId: string, scenario: any): RegressionArtifactResponse[] {
  const directArtifacts = artifacts.filter((artifact) => artifact.scenarioId === scenarioId);
  const prefixes = scenarioArtifactPrefixes(directArtifacts, scenario);
  const selected = new Map<string, RegressionArtifactResponse>();

  for (const artifact of directArtifacts) selected.set(artifact.id, artifact);
  for (const artifact of artifacts) {
    if (artifact.scenarioId) continue;
    const relativePath = artifactRelativePath(artifact);
    if (relativePath && prefixes.some((prefix) => relativePath.startsWith(prefix))) selected.set(artifact.id, artifact);
  }

  return artifacts.filter((artifact) => selected.has(artifact.id));
}

function scenarioArtifactPrefixes(directArtifacts: RegressionArtifactResponse[], scenario: any): string[] {
  const prefixes = new Set<string>();
  for (const artifact of directArtifacts) {
    const relativePath = artifactRelativePath(artifact);
    const prefix = relativePath?.match(/^(playwright\/scenarios\/[^/]+\/)/)?.[1];
    if (prefix) prefixes.add(prefix);
  }

  const fallbackName = stringValue(scenario.scenarioName) ?? stringValue(scenario.title);
  if (fallbackName) prefixes.add(`playwright/scenarios/${sanitizeArtifactFolderName(fallbackName)}/`);
  return [...prefixes];
}

function artifactRelativePath(artifact: RegressionArtifactResponse): string | undefined {
  const metadata = asRecord(artifact.metadata);
  return stringValue(metadata.relativePath)?.replace(/\\/g, "/");
}

function sanitizeArtifactFolderName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "artifact";
}

