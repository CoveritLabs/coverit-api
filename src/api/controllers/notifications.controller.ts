// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { InternalCodegenNotificationBodySchema } from "@models/notifications";
import * as notificationsService from "@services/notifications.service";
import { assertInternalServiceToken } from "@services/scenarioReports.service";
import { z } from "@utils/zod";

const CodegenNotificationParamsSchema = z.object({
  sessionId: z.uuid(),
});

export async function notifyCodegenSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertInternalServiceToken(req.headers["x-coverit-internal-token"]);
    const { sessionId } = CodegenNotificationParamsSchema.parse(req.params);
    const body = InternalCodegenNotificationBodySchema.parse(req.body);
    const response = await notificationsService.notifyCodegenSession(sessionId, body);
    res.status(StatusCodes.ACCEPTED).json(response);
  } catch (err) {
    next(err);
  }
}
