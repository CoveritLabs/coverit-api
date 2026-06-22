// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as projectController from "@api/controllers/project.controller";
import * as projectDashboardController from "@api/controllers/projectDashboard.controller";
import { projectActivityRecorder } from "@api/middlewares/projectActivity";
import { requireAuth } from "@api/middlewares/requireAuth";
import { requireProjectAdmin, requireProjectMembership } from "@api/middlewares/requireProjectAccess";
import { validateBody } from "@api/middlewares/validate";
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  AddMembersRequestSchema,
  RemoveMembersRequestSchema,
  UpdateMemberRequestSchema,
} from "@models/project";
import targetAppRoutes from "@api/routes/targetApplication.routes";
import integrationsRoutes from "@api/routes/integrations.routes";

const router = Router();

router.use(requireAuth);
router.use(projectActivityRecorder);

router.post("/", validateBody(CreateProjectRequestSchema), projectController.createProject);
router.put("/:projectId", requireProjectAdmin, validateBody(UpdateProjectRequestSchema), projectController.updateProject);
router.delete("/:projectId", requireProjectAdmin, projectController.deleteProject);
router.get("/", projectController.getProjects);
router.get("/:projectId/dashboard", requireProjectMembership, projectDashboardController.getProjectDashboard);
router.get("/:projectId", requireProjectMembership, projectController.getProject);

// Member management
router.post("/:projectId/members", requireProjectAdmin, validateBody(AddMembersRequestSchema), projectController.addProjectMembers);
router.put("/:projectId/members", requireProjectAdmin, validateBody(UpdateMemberRequestSchema), projectController.updateProjectMember);
router.delete("/:projectId/members", requireProjectAdmin, validateBody(RemoveMembersRequestSchema), projectController.removeProjectMembers);

// Leave project
router.post("/:projectId/leave", requireProjectMembership, projectController.leaveProject);

// Project integrations
router.use("/:projectId/integrations", integrationsRoutes);

// Target applications and related entities
router.use("/:projectId/target-applications", targetAppRoutes);

export default router;
