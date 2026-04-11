// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as crawlSessionController from "@api/controllers/crawlSession.controller";
import { requireAuth } from "@api/middlewares/requireAuth";
import { requireProjectAdmin, requireProjectMember, requireProjectMembership } from "@api/middlewares/requireProjectAccess";
import { validateBody } from "@api/middlewares/validate";
import { CreateCrawlSessionRequestSchema } from "@models/crawlSession";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireProjectMembership, crawlSessionController.getSessions);

router.post("/", requireProjectMember, validateBody(CreateCrawlSessionRequestSchema), crawlSessionController.createSession);

router.get("/:crawlSessionId", requireProjectMembership, crawlSessionController.getSessionDetails);

router.delete("/:crawlSessionId", requireProjectAdmin, crawlSessionController.deleteSession);

router.put("/:crawlSessionId/abort", requireProjectMember, crawlSessionController.abortSession);

router.put("/:crawlSessionId/start", requireProjectMember, crawlSessionController.startSession);

router.put("/:crawlSessionId/pause", requireProjectMember, crawlSessionController.pauseSession);

export default router;