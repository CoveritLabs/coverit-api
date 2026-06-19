// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";
import * as regressionRunController from "@api/controllers/regressionRun.controller";
import { requireProjectMembership } from "@api/middlewares/requireProjectAccess";

const router = Router({ mergeParams: true });

router.get("/", requireProjectMembership, regressionRunController.listRuns);
router.get("/:runId", requireProjectMembership, regressionRunController.getRun);
router.get("/:runId/scenarios", requireProjectMembership, regressionRunController.listScenarios);
router.get("/:runId/scenarios/:scenarioId", requireProjectMembership, regressionRunController.getScenario);
router.get("/:runId/scenarios/:scenarioId/events", requireProjectMembership, regressionRunController.listScenarioEvents);
router.get("/:runId/scenarios/:scenarioId/artifacts", requireProjectMembership, regressionRunController.listScenarioArtifacts);
router.get("/:runId/artifacts", requireProjectMembership, regressionRunController.listArtifacts);
router.get("/:runId/artifacts/:artifactId", requireProjectMembership, regressionRunController.getArtifact);
router.get("/:runId/artifacts/:artifactId/download", requireProjectMembership, regressionRunController.downloadArtifact);

export default router;
