// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as projectController from "@api/controllers/project.controller";
import { requireAuth } from "@api/middlewares/requireAuth";
import { requireProjectAdmin, requireProjectMember } from "@api/middlewares/requireProjectAccess";
import { validateBody } from "@api/middlewares/validate";
import { CreateProjectRequestSchema, UpdateProjectRequestSchema, AddMembersRequestSchema, RemoveMembersRequestSchema } from "@models/project";

const router = Router();

router.use(requireAuth);

router.post("/", validateBody(CreateProjectRequestSchema), projectController.createProject);
router.put("/:projectId", requireProjectAdmin, validateBody(UpdateProjectRequestSchema), projectController.updateProject);
router.delete("/:projectId", requireProjectAdmin, projectController.deleteProject);
router.get("/", projectController.getProjects);
router.get("/:projectId", requireProjectMember, projectController.getProject);

// Member management
router.post("/:projectId/members", requireProjectAdmin, validateBody(AddMembersRequestSchema), projectController.addProjectMembers);
router.delete("/:projectId/members", requireProjectAdmin, validateBody(RemoveMembersRequestSchema), projectController.removeProjectMembers);

export default router;
