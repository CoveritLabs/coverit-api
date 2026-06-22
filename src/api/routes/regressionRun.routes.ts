// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";
import * as regressionRunController from "@api/controllers/regressionRun.controller";
import * as scenarioReportsController from "@api/controllers/scenarioReports.controller";
import { requireProjectMembership } from "@api/middlewares/requireProjectAccess";

const router = Router({ mergeParams: true });

router.use(requireProjectMembership);

router.get("/", regressionRunController.listRuns);
router.get("/:runId", regressionRunController.getRun);
router.get("/:runId/scenarios", regressionRunController.listScenarios);
router.get("/:runId/scenarios/:scenarioId", regressionRunController.getScenario);
router.get("/:runId/scenarios/:scenarioId/events", regressionRunController.listScenarioEvents);
router.get("/:runId/scenarios/:scenarioId/artifacts", regressionRunController.listScenarioArtifacts);
router.post("/:runId/scenarios/:scenarioId/reports/:provider", scenarioReportsController.createScenarioReport);
router.get("/:runId/artifacts", regressionRunController.listArtifacts);
router.get("/:runId/artifacts/:artifactId", regressionRunController.getArtifact);
router.get("/:runId/artifacts/:artifactId/download", regressionRunController.downloadArtifact);

export default router;
