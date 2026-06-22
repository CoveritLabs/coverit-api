// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as manualSessionController from "@api/controllers/manualSession.controller";
import { requireProjectMember } from "@api/middlewares/requireProjectAccess";

const router = Router({ mergeParams: true });

router.post("/connect", requireProjectMember, manualSessionController.connectManualSession);

export default router;
