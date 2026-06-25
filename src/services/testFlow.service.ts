// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { createHash, randomUUID } from "crypto";

import prisma from "@lib/prisma";
import { CRAWL_SESSION_MESSAGES } from "@constants/messages";
import { TEST_FLOW_STEP_LABELS, TEST_FLOW_STEP_LABEL_STATUSES } from "@constants/testFlowStepLabels";
import { env } from "@config/env";
import redis from "@lib/redis";
import { cacheGetJSON, cacheKeys, cacheSetJSON } from "@lib/cache";
import type { TestFlowStepLabel } from "@models/testFlowStepLabels";
import { enqueueBddGeneration } from "@queues/arq/docgenArq";
import { addFlowEditorSessionJob } from "@queues/crawl.queue";
import { getTestFlowStepLabels } from "@repositories/testFlowStepLabels.repository";
import type {
  FlowEditorConnectResponse,
  FlowEditorDetailResponse,
  FlowEditorDraftStep,
  FlowEditorTransitionStep,
  GenerateTestFlowBody,
  GenerateTestFlowResponse,
  ListTestFlowsQuery,
  ListTestFlowsResponse,
  SaveFlowEditorStepsBody,
  SaveFlowEditorStepsResponse,
  TestFlowResponse,
  TestFlowStatus,
} from "@models/testFlow";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "@utils/errors";

type MappedTestFlow = {
  id: string;
  crawlSessionId: string;
  appVersionId: string;
  appVersion: {
    version: string;
  };
  checkpointStateHash: string;
  transitionRefs: string[];
  editorSteps?: unknown;
  testFlowType: TestFlowResponse["testFlowType"];
  stepCount: number;
  createdAt: Date;
  generatedAt: Date | null;
  modifiedAt: Date;
  crawlSession: {
    id: string;
    triggerType: string;
    status: string;
    createdAt: Date;
    finishedAt: Date | null;
  };
};

type FlowEditorTicketPayload = {
  editorSessionId: string;
  flowId: string;
  userId: string;
};

function editorStepsFromUnknown(value: unknown): FlowEditorDraftStep[] {
  return Array.isArray(value) ? (value as FlowEditorDraftStep[]) : [];
}

function editorStepCount(value: unknown): number {
  return editorStepsFromUnknown(value).length;
}

function transitionLabelsCacheKey(flow: Pick<MappedTestFlow, "checkpointStateHash" | "transitionRefs">, graphId: string): string {
  const transitionHash = createHash("sha256").update(JSON.stringify(flow.transitionRefs)).digest("hex");
  return cacheKeys.testFlowLabels.transitions(graphId, flow.checkpointStateHash, transitionHash);
}

function transitionStepsFor(
  flow: Pick<MappedTestFlow, "transitionRefs">,
  labels: TestFlowStepLabel[] = [],
): FlowEditorTransitionStep[] {
  const labelsByTransition = new Map(labels.map((label) => [label.transitionId, label]));
  return flow.transitionRefs.map((transitionId, index) => ({
    id: `${index + 1}:${transitionId}`,
    index: index + 1,
    transitionId,
    label: labelsByTransition.get(transitionId)?.label ?? TEST_FLOW_STEP_LABELS.fallbackTransitionLabel(index + 1),
    action: labelsByTransition.get(transitionId)?.action,
    labelingStatus: labelsByTransition.get(transitionId)?.labelingStatus ?? TEST_FLOW_STEP_LABEL_STATUSES.MISSING,
    fromState: labelsByTransition.get(transitionId)?.fromState,
    toState: labelsByTransition.get(transitionId)?.toState,
  }));
}

async function getCachedTransitionLabels(flow: MappedTestFlow): Promise<TestFlowStepLabel[]> {
  if (flow.transitionRefs.length === 0) return [];

  const graphId = graphIdForTestFlow(flow);
  const key = transitionLabelsCacheKey(flow, graphId);
  const cached = await cacheGetJSON<TestFlowStepLabel[]>(key, "testFlow.stepLabels");
  if (cached) {
    return cached;
  }

  try {
    const labels = await getTestFlowStepLabels(graphId, flow.transitionRefs);
    await cacheSetJSON(key, labels, TEST_FLOW_STEP_LABELS.CACHE_TTL_SECONDS, "testFlow.stepLabels");
    return labels;
  } catch {
    return [];
  }
}

function assertEditorStepsTargetFlow(flow: Pick<MappedTestFlow, "transitionRefs">, editorSteps: FlowEditorDraftStep[]): void {
  const transitionIds = new Set(flow.transitionRefs);
  const invalid = editorSteps.find((step) => !transitionIds.has(step.position.transitionId));
  if (invalid) {
    throw new BadRequestError(`Editor step "${invalid.id}" targets a transition that is not part of this TestFlow`);
  }
}

async function issueFlowEditorTicket(editorSessionId: string, flowId: string, userId: string): Promise<string> {
  const ticket = randomUUID();
  const payload: FlowEditorTicketPayload = { editorSessionId, flowId, userId };
  await redis.set(cacheKeys.flowEditor.ticket(ticket), JSON.stringify(payload), "EX", env.MANUAL_SESSION_TICKET_TTL_SECONDS);
  return ticket;
}

export async function consumeFlowEditorTicket(editorSessionId: string, ticket: string): Promise<FlowEditorTicketPayload> {
  const key = cacheKeys.flowEditor.ticket(ticket);
  const raw = await redis.get(key);
  if (!raw) {
    throw new UnauthorizedError("Flow editor ticket is invalid or expired");
  }

  await redis.del(key);

  const parsed = JSON.parse(raw) as FlowEditorTicketPayload;
  if (parsed.editorSessionId !== editorSessionId) {
    throw new UnauthorizedError("Flow editor ticket does not match the session ID");
  }

  return parsed;
}

function mapTestFlow(flow: MappedTestFlow): TestFlowResponse {
  const status = getTestFlowStatus(flow.generatedAt, flow.modifiedAt);
  return {
    id: flow.id,
    crawlSessionId: flow.crawlSessionId,
    appVersionId: flow.appVersionId,
    appVersionName: flow.appVersion.version,
    checkpointStateHash: flow.checkpointStateHash,
    transitionRefs: flow.transitionRefs,
    testFlowType: flow.testFlowType,
    stepCount: flow.stepCount,
    editorStepCount: editorStepCount(flow.editorSteps),
    status,
    createdAt: flow.createdAt.toISOString(),
    generatedAt: flow.generatedAt ? flow.generatedAt.toISOString() : null,
    modifiedAt: flow.modifiedAt.toISOString(),
    crawlSession: {
      id: flow.crawlSession.id,
      triggerType: flow.crawlSession.triggerType,
      status: flow.crawlSession.status,
      createdAt: flow.crawlSession.createdAt.toISOString(),
      finishedAt: flow.crawlSession.finishedAt ? flow.crawlSession.finishedAt.toISOString() : null,
    },
  };
}

function getTestFlowStatus(generatedAt: Date | null, modifiedAt: Date): TestFlowStatus {
  if (!generatedAt) return "NEEDS_GENERATION";
  return modifiedAt.getTime() > generatedAt.getTime() ? "STALE" : "GENERATED";
}

export async function listTestFlows(
  projectId: string,
  appId: string,
  query: ListTestFlowsQuery,
): Promise<ListTestFlowsResponse> {
  const app = await prisma.targetApplication.findUnique({
    where: { id: appId },
    select: { id: true, projectId: true },
  });
  if (!app || app.projectId !== projectId) {
    throw new NotFoundError(CRAWL_SESSION_MESSAGES.APPLICATION_NOT_FOUND);
  }

  const limit = query.limit;
  const flows = await prisma.testFlow.findMany({
    where: {
      appVersion: {
        targetApplicationId: appId,
        targetApplication: { projectId },
      },
      ...(query.versionId ? { appVersionId: query.versionId } : {}),
      ...(query.sessionId ? { crawlSessionId: query.sessionId } : {}),
      ...(query.type ? { testFlowType: query.type } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    take: limit + 1,
    include: {
      appVersion: {
        select: { version: true },
      },
      crawlSession: {
        select: {
          id: true,
          triggerType: true,
          status: true,
          createdAt: true,
          finishedAt: true,
        },
      },
    },
  });

  const page = flows.slice(0, limit) as MappedTestFlow[];
  return {
    flows: page.map(mapTestFlow),
    nextCursor: flows.length > limit ? flows[limit].id : null,
  };
}

async function findScopedFlow(projectId: string, appId: string, flowId: string): Promise<MappedTestFlow> {
  const flow = await prisma.testFlow.findFirst({
    where: {
      id: flowId,
      appVersion: {
        targetApplicationId: appId,
        targetApplication: { projectId },
      },
    },
    include: {
      appVersion: {
        select: { version: true },
      },
      crawlSession: {
        select: {
          id: true,
          triggerType: true,
          status: true,
          createdAt: true,
          finishedAt: true,
        },
      },
    },
  });

  const mappedFlow = flow as MappedTestFlow | null;
  if (!mappedFlow) {
    throw new NotFoundError("Test flow not found");
  }

  return mappedFlow;
}

function sortEditorSteps(flow: Pick<MappedTestFlow, "transitionRefs">, editorSteps: FlowEditorDraftStep[]): FlowEditorDraftStep[] {
  const transitionOrder = new Map(flow.transitionRefs.map((transitionId, index) => [transitionId, index]));
  return [...editorSteps].sort((left, right) => {
    const leftTransition = transitionOrder.get(left.position.transitionId) ?? Number.MAX_SAFE_INTEGER;
    const rightTransition = transitionOrder.get(right.position.transitionId) ?? Number.MAX_SAFE_INTEGER;
    if (leftTransition !== rightTransition) return leftTransition - rightTransition;
    if (left.position.edge !== right.position.edge) return left.position.edge === "before" ? -1 : 1;
    if (left.order !== right.order) return left.order - right.order;
    return left.id.localeCompare(right.id);
  });
}

export async function getFlowEditor(projectId: string, appId: string, flowId: string): Promise<FlowEditorDetailResponse> {
  const flow = await findScopedFlow(projectId, appId, flowId);
  const labels = await getCachedTransitionLabels(flow);
  return {
    flow: mapTestFlow(flow),
    transitionSteps: transitionStepsFor(flow, labels),
    editorSteps: sortEditorSteps(flow, editorStepsFromUnknown(flow.editorSteps)),
  };
}

export async function saveFlowEditorSteps(
  projectId: string,
  appId: string,
  flowId: string,
  input: SaveFlowEditorStepsBody,
): Promise<SaveFlowEditorStepsResponse> {
  const flow = await findScopedFlow(projectId, appId, flowId);
  assertEditorStepsTargetFlow(flow, input.editorSteps);
  const editorSteps = sortEditorSteps(flow, input.editorSteps);
  const modifiedAt = new Date();

  const result = await (prisma as any).testFlow.updateMany({
    where: {
      id: flowId,
      appVersion: {
        targetApplicationId: appId,
        targetApplication: { projectId },
      },
    },
    data: {
      editorSteps,
      modifiedAt,
    },
  });

  if (result.count !== 1) {
    throw new NotFoundError("Test flow not found");
  }

  return {
    editorSteps,
    editorStepCount: editorSteps.length,
  };
}

export async function connectFlowEditor(
  projectId: string,
  appId: string,
  flowId: string,
  userId: string,
): Promise<FlowEditorConnectResponse> {
  if (!userId) {
    throw new UnauthorizedError("Authentication is required");
  }

  await findScopedFlow(projectId, appId, flowId);

  const editorSessionId = randomUUID();
  await addFlowEditorSessionJob(editorSessionId, flowId);

  return {
    editorSessionId,
    wsTicket: await issueFlowEditorTicket(editorSessionId, flowId, userId),
  };
}

export async function generateTestFlow(
  projectId: string,
  appId: string,
  flowId: string,
  input: GenerateTestFlowBody,
): Promise<GenerateTestFlowResponse> {
  const mappedFlow = await findScopedFlow(projectId, appId, flowId);

  const regressionCodebase = await prisma.regressionCodebase.findUnique({
    where: { id: input.regressionCodebaseId },
    select: { id: true, targetApplicationId: true },
  });

  if (!regressionCodebase || regressionCodebase.targetApplicationId !== appId) {
    throw new NotFoundError(CRAWL_SESSION_MESSAGES.CODEBASE_NOT_FOUND);
  }

  if (getTestFlowStatus(mappedFlow.generatedAt, mappedFlow.modifiedAt) === "GENERATED") {
    throw new ConflictError("Test flow is already generated");
  }

  if (mappedFlow.transitionRefs.length === 0) {
    throw new BadRequestError("Test flow has no transitions to generate");
  }

  const editorSteps = sortEditorSteps(mappedFlow, editorStepsFromUnknown(mappedFlow.editorSteps));
  const payload = {
    session_id: mappedFlow.crawlSessionId,
    graph_id: graphIdForTestFlow(mappedFlow),
    regression_codebase_id: regressionCodebase.id,
    codegen_config: input.codegenConfig,
    flow_ids: [mappedFlow.id],
    flows: [
      {
        flow_id: mappedFlow.id,
        checkpoint_hash: mappedFlow.checkpointStateHash,
        transition_ids: mappedFlow.transitionRefs,
        editor_steps: editorSteps,
      },
    ],
  };

  const jobId = await enqueueBddGeneration(payload);

  return {
    message: "Test flow generation queued",
    flowId: mappedFlow.id,
    jobId,
  };
}

function graphIdForTestFlow(flow: MappedTestFlow): string {
  return flow.testFlowType === "COVERAGE" ? flow.appVersionId : flow.crawlSessionId;
}

export async function markTestFlowsGenerated(sessionId: string, flowIds: string[], generatedAt = new Date()): Promise<number> {
  const uniqueFlowIds = Array.from(new Set(flowIds.filter(Boolean)));
  if (uniqueFlowIds.length === 0) {
    return 0;
  }

  const result = await (prisma as any).testFlow.updateMany({
    where: {
      crawlSessionId: sessionId,
      id: { in: uniqueFlowIds },
    },
    data: {
      generatedAt,
    },
  });

  return result.count;
}
