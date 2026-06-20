// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as integrationsController from "@api/controllers/integrations.controller";
import { requireProjectAdmin, requireProjectMembership } from "@api/middlewares/requireProjectAccess";

const router = Router({ mergeParams: true });

router.post("/:provider/oauth", requireProjectAdmin, integrationsController.startOAuth);
router.get("/:provider/reporting/options", requireProjectMembership, integrationsController.getReportingOptions);
router.put("/:provider/reporting/config", requireProjectAdmin, integrationsController.updateReportingConfig);
router.get("/:provider", requireProjectMembership, integrationsController.getIntegrationStatus);
router.delete("/:provider", requireProjectAdmin, integrationsController.disconnectIntegration);

export default router;
