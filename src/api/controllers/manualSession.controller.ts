// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { AppVersionParamsSchema } from "@models/crawlSession";
import { getCurrentUserId } from "@api/middlewares/requireAuth";
import { createManualSession, reattachManualSession } from "@services/manualSession.service";
import { z } from "@utils/zod";

const ManualSessionParamsSchema = AppVersionParamsSchema.extend({
  sessionId: z.uuid(),
});

export const connectManualSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId } = AppVersionParamsSchema.parse(req.params);
    const userId = getCurrentUserId(req);
    const result = await createManualSession(projectId, appId, versionId, userId);
    req.recordProjectActivity?.({
      projectId,
      eventType: "manual_session.connected",
      entityType: "crawl_session",
      entityId: result.sessionId,
      message: "Connected manual session",
      metadata: { applicationId: appId, versionId },
    });
    res.status(StatusCodes.CREATED).json(result);
  } catch (e) {
    next(e);
  }
};

export const reattachManualSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId, sessionId } = ManualSessionParamsSchema.parse(req.params);
    const userId = getCurrentUserId(req);
    const result = await reattachManualSession(projectId, appId, versionId, sessionId, userId);
    req.recordProjectActivity?.({
      projectId,
      eventType: "manual_session.reattached",
      entityType: "crawl_session",
      entityId: result.sessionId,
      message: "Reattached manual session",
      metadata: { applicationId: appId, versionId },
    });
    res.status(StatusCodes.OK).json(result);
  } catch (e) {
    next(e);
  }
};
