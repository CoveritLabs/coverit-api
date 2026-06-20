// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { SaveAllFlowsBodySchema } from "@models/testFlow";
import { saveAllFlows } from "@services/testFlow.service";

export const saveFlows = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { flows } = SaveAllFlowsBodySchema.parse(req.body);
    await saveAllFlows(sessionId, flows);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
