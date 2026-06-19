// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import multer from "multer";
import { Router } from "express";
import * as regressionRunController from "@api/controllers/regressionRun.controller";
import { env } from "@config/env";

const router = Router();
const artifactUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.REGRESSION_ARTIFACT_MAX_BYTES },
});

router.post("/runs/:runId/events", regressionRunController.ingestEvents);
router.post("/runs/:runId/artifacts", artifactUpload.single("file"), regressionRunController.uploadArtifact);
router.post("/runs/:runId/complete", regressionRunController.completeRun);

export default router;
