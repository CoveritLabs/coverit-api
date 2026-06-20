// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as integrationsController from "@api/controllers/integrations.controller";

const router = Router();

router.get("/:provider/callback", integrationsController.oauthCallback);

export default router;
