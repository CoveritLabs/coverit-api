// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { GenerateUserGuidesBodySchema } from "@models/userGuides";
import { AppVersionParamsSchema } from "@models/crawlSession";
import * as userGuidesService from "@services/userGuides.service";

export const getUserGuideStatesForVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, appId, versionId } = AppVersionParamsSchema.parse(req.params);
    const response = await userGuidesService.getUserGuideStates(projectId, appId, versionId);
    res.status(StatusCodes.OK).json(response);
  } catch (e) {
    next(e);
  }
};

export const generateUserGuidesForVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, appId, versionId } = AppVersionParamsSchema.parse(req.params);
    const body = GenerateUserGuidesBodySchema.parse(req.body);
    const response = await userGuidesService.generateUserGuide(projectId, appId, versionId, body);
    if (!response.error) {
      req.recordProjectActivity?.({
        projectId,
        eventType: "user_guide.generated",
        entityType: "user_guide",
        message: "Generated user guide",
        metadata: {
          applicationId: appId,
          versionId,
          startStateHash: body.startStateHash,
          endStateHash: body.endStateHash,
        },
      });
    }
    res.status(StatusCodes.OK).json(response);
  } catch (e) {
    next(e);
  }
};

