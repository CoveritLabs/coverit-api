// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppParamsSchema } from "@models/crawlSession";
import { GenerateTestFlowBodySchema, ListTestFlowsQuerySchema, SaveFlowEditorStepsBodySchema } from "@models/testFlow";
import * as testFlowService from "@services/testFlow.service";
import { z } from "@utils/zod";

const TestFlowParamsSchema = AppParamsSchema.extend({
  flowId: z.uuid(),
});

export const listTestFlows = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId } = AppParamsSchema.parse(req.params);
    const query = ListTestFlowsQuerySchema.parse(req.query);
    const response = await testFlowService.listTestFlows(projectId, appId, query);
    res.status(StatusCodes.OK).json(response);
  } catch (e) {
    next(e);
  }
};

export const generateTestFlow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, flowId } = TestFlowParamsSchema.parse(req.params);
    const body = GenerateTestFlowBodySchema.parse(req.body);
    const response = await testFlowService.generateTestFlow(projectId, appId, flowId, body);
    req.recordProjectActivity?.({
      projectId,
      eventType: "test_flow.generation_queued",
      entityType: "test_flow",
      entityId: response.flowId,
      message: "Queued test flow generation",
      metadata: { applicationId: appId, jobId: response.jobId },
    });
    res.status(StatusCodes.ACCEPTED).json(response);
  } catch (e) {
    next(e);
  }
};

export const getFlowEditor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, flowId } = TestFlowParamsSchema.parse(req.params);
    const response = await testFlowService.getFlowEditor(projectId, appId, flowId);
    res.status(StatusCodes.OK).json(response);
  } catch (e) {
    next(e);
  }
};

export const saveFlowEditorSteps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, flowId } = TestFlowParamsSchema.parse(req.params);
    const body = SaveFlowEditorStepsBodySchema.parse(req.body);
    const response = await testFlowService.saveFlowEditorSteps(projectId, appId, flowId, body);
    res.status(StatusCodes.OK).json(response);
  } catch (e) {
    next(e);
  }
};

export const connectFlowEditor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, flowId } = TestFlowParamsSchema.parse(req.params);
    const response = await testFlowService.connectFlowEditor(projectId, appId, flowId, req.userId ?? "");
    res.status(StatusCodes.ACCEPTED).json(response);
  } catch (e) {
    next(e);
  }
};
