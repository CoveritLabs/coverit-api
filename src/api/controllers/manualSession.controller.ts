// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { AppVersionParamsSchema } from "@models/crawlSession";
import { getCurrentUserId } from "@api/middlewares/requireAuth";
import { createManualSession } from "@services/manualSession.service";

export const connectManualSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId } = AppVersionParamsSchema.parse(req.params);
    const userId = getCurrentUserId(req);
    const result = await createManualSession(projectId, appId, versionId, userId);
    res.status(StatusCodes.CREATED).json(result);
  } catch (e) {
    next(e);
  }
};
