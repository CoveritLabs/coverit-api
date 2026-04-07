// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as targetController from "@api/controllers/targetApplication.controller";
import * as rcController from "@api/controllers/regressionCodebase.controller";
import { requireProjectAdmin, requireProjectMember, requireProjectMembership } from "@api/middlewares/requireProjectAccess";
import { validateBody } from "@api/middlewares/validate";
import {
  CreateTargetApplicationRequestSchema,
  UpdateTargetApplicationRequestSchema,
  CreateTargetApplicationVersionRequestSchema,
} from "@models/targetApplication";
import { CreateRegressionCodebaseRequestSchema, UpdateRegressionCodebaseRequestSchema } from "@models/regressionCodebase";

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

// Regression codebases
router.post(
  "/:appId/regression-codebases",
  requireProjectAdmin,
  validateBody(CreateRegressionCodebaseRequestSchema),
  rcController.createRegressionCodebase,
);
router.put(
  "/:appId/regression-codebases/:codebaseId",
  requireProjectAdmin,
  validateBody(UpdateRegressionCodebaseRequestSchema),
  rcController.updateRegressionCodebase,
);
router.delete("/:appId/regression-codebases/:codebaseId", requireProjectAdmin, rcController.deleteRegressionCodebase);
router.get("/:appId/regression-codebases", requireProjectMembership, rcController.getRegressionCodebases);
router.get("/:appId/regression-codebases/:codebaseId", requireProjectMembership, rcController.getRegressionCodebase);

export default router;
