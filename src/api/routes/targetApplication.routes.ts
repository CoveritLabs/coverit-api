// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as targetController from "@api/controllers/targetApplication.controller";
import { requireProjectAdmin, requireProjectMember, requireProjectMembership } from "@api/middlewares/requireProjectAccess";
import { validateBody } from "@api/middlewares/validate";
import {
  CreateTargetApplicationRequestSchema,
  UpdateTargetApplicationRequestSchema,
  CreateTargetApplicationVersionRequestSchema,
} from "@models/targetApplication";
import crawlSessionRoutes from "@api/routes/crawlSession.routes";
import crawlScheduleRoutes from "@api/routes/crawlSchedule.routes";
import regressionCodebaseRoutes from "@api/routes/regressionCodebase.routes";

const router = Router({ mergeParams: true });

// Target applications
router.post("/", requireProjectAdmin, validateBody(CreateTargetApplicationRequestSchema), targetController.createTargetApplication);
router.put("/:appId", requireProjectAdmin, validateBody(UpdateTargetApplicationRequestSchema), targetController.updateTargetApplication);
router.delete("/:appId", requireProjectAdmin, targetController.deleteTargetApplication);
router.get("/", requireProjectMembership, targetController.getTargetApplications);
router.get("/:appId", requireProjectMembership, targetController.getTargetApplication);

// Versions
router.post("/:appId/versions", requireProjectMember, validateBody(CreateTargetApplicationVersionRequestSchema), targetController.createVersion);
router.delete("/:appId/versions/:versionId", requireProjectAdmin, targetController.deleteVersion);

router.use("/:appId/versions/:versionId/crawl-sessions", crawlSessionRoutes);

// Crawl schedules
router.use("/:appId/crawl-schedules", crawlScheduleRoutes);

// Regression codebases
router.use("/:appId/regression-codebases", regressionCodebaseRoutes);

export default router;
