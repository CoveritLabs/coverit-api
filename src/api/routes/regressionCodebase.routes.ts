// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as rcController from "@api/controllers/regressionCodebase.controller";
import { requireProjectAdmin, requireProjectMembership } from "@api/middlewares/requireProjectAccess";
import { validateBody } from "@api/middlewares/validate";
import { CreateRegressionCodebaseRequestSchema, UpdateRegressionCodebaseRequestSchema } from "@models/regressionCodebase";

const router = Router({ mergeParams: true });

router.post("/", requireProjectAdmin, validateBody(CreateRegressionCodebaseRequestSchema), rcController.createRegressionCodebase);
router.put("/:codebaseId", requireProjectAdmin, validateBody(UpdateRegressionCodebaseRequestSchema), rcController.updateRegressionCodebase);
router.delete("/:codebaseId", requireProjectAdmin, rcController.deleteRegressionCodebase);
router.get("/", requireProjectMembership, rcController.getRegressionCodebases);
router.get("/:codebaseId", requireProjectMembership, rcController.getRegressionCodebase);

export default router;
