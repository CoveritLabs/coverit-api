// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";

import { PROJECT_MESSAGES } from "@constants/messages";
import { ForbiddenError } from "@utils/errors";
import * as projectService from "@services/project.service";
import { getCurrentUserId } from "@api/middlewares/requireAuth";
import { ProjectRole } from "@models/project";

const ROLE_PRIORITY: Record<ProjectRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
};

async function requireProjectRole(minRole: ProjectRole, req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getCurrentUserId(req);
    const { projectId } = req.params;

    const role = await projectService.getMemberRole(projectId, userId);
    if (!role) {
      next(new ForbiddenError(PROJECT_MESSAGES.MEMBER_REQUIRED));
      return;
    }

    if (ROLE_PRIORITY[role] < ROLE_PRIORITY[minRole]) {
      const msg = minRole === ProjectRole.ADMIN ? PROJECT_MESSAGES.ADMIN_REQUIRED : PROJECT_MESSAGES.MEMBER_REQUIRED;
      next(new ForbiddenError(msg));
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireProjectMembership(req: Request, res: Response, next: NextFunction) {
  return requireProjectRole(ProjectRole.VIEWER, req, res, next);
}

export function requireProjectMember(req: Request, res: Response, next: NextFunction) {
  return requireProjectRole(ProjectRole.MEMBER, req, res, next);
}

export function requireProjectAdmin(req: Request, res: Response, next: NextFunction) {
  return requireProjectRole(ProjectRole.ADMIN, req, res, next);
}
