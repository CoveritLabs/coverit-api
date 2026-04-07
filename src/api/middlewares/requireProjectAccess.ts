// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";

import { PROJECT_MESSAGES } from "@constants/messages";
import { ForbiddenError } from "@utils/errors";
import * as projectService from "@services/project.service";
import { getCurrentUserId } from "@api/middlewares/requireAuth";

export async function requireProjectMember(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getCurrentUserId(req);
    const { projectId } = req.params;

    const member = await projectService.isMember(projectId, userId);
    if (member) {
      next();
      return;
    }

    next(new ForbiddenError(PROJECT_MESSAGES.MEMBER_REQUIRED));
  } catch (err) {
    next(err);
  }
}

export async function requireProjectAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getCurrentUserId(req);
    const { projectId } = req.params;

    const admin = await projectService.isAdmin(projectId, userId);
    if (admin) {
      next();
      return;
    }

    next(new ForbiddenError(PROJECT_MESSAGES.ADMIN_REQUIRED));
  } catch (err) {
    next(err);
  }
}
