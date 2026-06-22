// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppParamsSchema } from "@models/crawlSession";
import { GenerateTestFlowBodySchema, ListTestFlowsQuerySchema } from "@models/testFlow";
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
    res.status(StatusCodes.ACCEPTED).json(response);
  } catch (e) {
    next(e);
  }
};
