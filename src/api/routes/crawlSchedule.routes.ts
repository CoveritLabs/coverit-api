// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Router } from "express";

import * as crawlScheduleController from "@api/controllers/crawlSchedule.controller";
import { requireProjectAdmin, requireProjectMember, requireProjectMembership } from "@api/middlewares/requireProjectAccess";
import { validateBody } from "@api/middlewares/validate";
import { CreateCrawlScheduleRequestSchema, UpdateCrawlScheduleRequestSchema } from "@models/crawlSchedule";

const router = Router({ mergeParams: true });

router.get("/", requireProjectMembership, crawlScheduleController.getSchedules);
router.post("/", requireProjectMember, validateBody(CreateCrawlScheduleRequestSchema), crawlScheduleController.createSchedule);
router.get("/:scheduleId", requireProjectMembership, crawlScheduleController.getSchedule);
router.put("/:scheduleId", requireProjectMember, validateBody(UpdateCrawlScheduleRequestSchema), crawlScheduleController.updateSchedule);
router.delete("/:scheduleId", requireProjectAdmin, crawlScheduleController.deleteSchedule);

export default router;
