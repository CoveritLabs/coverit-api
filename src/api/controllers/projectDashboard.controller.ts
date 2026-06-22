// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { ProjectDashboardQuerySchema } from "@models/projectDashboard";
import * as projectDashboardService from "@services/projectDashboard.service";

export async function getProjectDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const query = ProjectDashboardQuerySchema.parse(req.query);
    const response = await projectDashboardService.getProjectDashboard(projectId, query.versionId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}
