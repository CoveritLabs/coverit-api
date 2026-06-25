// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as guidesController from "@api/controllers/userGuides.controller";
import { requireAuth } from "@api/middlewares/requireAuth";
import { requireProjectMembership } from "@api/middlewares/requireProjectAccess";
import { validateBody } from "@api/middlewares/validate";
import { GenerateUserGuidesBodySchema } from "@models/userGuides";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/user-guide-states", requireProjectMembership, guidesController.getUserGuideStatesForVersion);
router.post(
  "/generate-user-guide",
  requireProjectMembership,
  validateBody(GenerateUserGuidesBodySchema),
  guidesController.generateUserGuidesForVersion,
);

export default router;
