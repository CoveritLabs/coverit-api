// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as testFlowController from "@api/controllers/testFlow.controller";

const router = Router({ mergeParams: true });

router.get("/", testFlowController.listTestFlows);
router.get("/:flowId/editor", testFlowController.getFlowEditor);
router.put("/:flowId/editor/steps", testFlowController.saveFlowEditorSteps);
router.post("/:flowId/editor/connect", testFlowController.connectFlowEditor);
router.post("/:flowId/generate", testFlowController.generateTestFlow);

export default router;
