// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";
import * as notificationsController from "@api/controllers/notifications.controller";

const router = Router();

router.post("/notifications/codegen/:sessionId/notifications", notificationsController.notifyCodegenSession);

export default router;
