// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { GenerateUserGuidesBodySchema } from "@models/userGuides";
import { AppVersionParamsSchema, CrawlSessionParamsSchema } from "@models/crawlSession";
import * as userGuidesService from "@services/userGuides.service";

export const getUserGuideStatesForVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, appId, versionId } = AppVersionParamsSchema.parse(req.params);
    const response = await userGuidesService.getUserGuideStatesForVersion(projectId, appId, versionId);
    res.status(StatusCodes.OK).json(response);
  } catch (e) {
    next(e);
  }
};

export const getUserGuideStates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, appId, versionId, crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
    const response = await userGuidesService.getUserGuideStates(projectId, appId, versionId, crawlSessionId);
    res.status(StatusCodes.OK).json(response);
  } catch (e) {
    next(e);
  }
};

export const generateUserGuidesForVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, appId, versionId } = AppVersionParamsSchema.parse(req.params);
    const body = GenerateUserGuidesBodySchema.parse(req.body);
    const response = await userGuidesService.generateUserGuideForVersion(projectId, appId, versionId, body);
    res.status(StatusCodes.OK).json(response);
  } catch (e) {
    next(e);
  }
};

export const generateUserGuides = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, appId, versionId, crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
    const body = GenerateUserGuidesBodySchema.parse(req.body);
    const response = await userGuidesService.generateUserGuide(projectId, appId, versionId, crawlSessionId, body);
    res.status(StatusCodes.OK).json(response);
  } catch (e) {
    next(e);
  }
};
