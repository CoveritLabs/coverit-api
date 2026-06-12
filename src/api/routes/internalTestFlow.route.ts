// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";
import { saveFlows, SaveAllFlowsBodySchema } from "@api/controllers/testFlow.controller";
import { validateBody } from "@api/middlewares/validate";

// Mounted at /internal in app.ts
// POST /internal/sessions/:sessionId/flows
const router = Router();

router.post("/sessions/:sessionId/flows", validateBody(SaveAllFlowsBodySchema), saveFlows);

export default router;