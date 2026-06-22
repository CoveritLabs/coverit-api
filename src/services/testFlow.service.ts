// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { CRAWL_SESSION_MESSAGES } from "@constants/messages";
import { enqueueBddGeneration } from "@queues/arq/docgenArq";
import type {
  GenerateTestFlowBody,
  GenerateTestFlowResponse,
  ListTestFlowsQuery,
  ListTestFlowsResponse,
  TestFlowResponse,
  TestFlowStatus,
} from "@models/testFlow";
import { BadRequestError, ConflictError, NotFoundError } from "@utils/errors";

type MappedTestFlow = {
  id: string;
  crawlSessionId: string;
  appVersionId: string;
  appVersion: {
    version: string;
  };
  checkpointStateHash: string;
  transitionRefs: string[];
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

export async function generateTestFlow(
  projectId: string,
  appId: string,
  flowId: string,
  input: GenerateTestFlowBody,
): Promise<GenerateTestFlowResponse> {
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
