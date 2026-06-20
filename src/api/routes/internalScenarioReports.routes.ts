// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";
import * as scenarioReportsController from "@api/controllers/scenarioReports.controller";

const router = Router();

router.post("/reports/scenario/claim", scenarioReportsController.claimScenarioReport);
router.get("/reports/scenario/:reportId/context", scenarioReportsController.getScenarioReportContext);
router.get("/reports/scenario/:reportId/artifacts/:artifactId/download", scenarioReportsController.downloadScenarioReportArtifact);
router.patch("/reports/scenario/:reportId", scenarioReportsController.patchScenarioReport);

export default router;
