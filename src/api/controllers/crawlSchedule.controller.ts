// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import * as crawlScheduleService from "@services/crawlSchedule.service";
import { AppParamsSchema } from "@models/crawlSession";
import { CreateCrawlScheduleRequestSchema, UpdateCrawlScheduleRequestSchema } from "@models/crawlSchedule";
import { z } from "@utils/zod";

export async function createSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = AppParamsSchema.parse(req.params);
    const body = CreateCrawlScheduleRequestSchema.parse(req.body);
    const result = await crawlScheduleService.createSchedule(projectId, appId, body);
    res.status(StatusCodes.CREATED).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = AppParamsSchema.parse(req.params);
    const result = await crawlScheduleService.getSchedules(projectId, appId);
    res.status(StatusCodes.OK).json({ schedules: result });
  } catch (err) {
    next(err);
  }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = AppParamsSchema.parse(req.params);
    const { scheduleId } = z.object({ scheduleId: z.uuid() }).parse(req.params);
    const result = await crawlScheduleService.getSchedule(projectId, appId, scheduleId);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = AppParamsSchema.parse(req.params);
    const { scheduleId } = z.object({ scheduleId: z.uuid() }).parse(req.params);
    const body = UpdateCrawlScheduleRequestSchema.parse(req.body);
    const result = await crawlScheduleService.updateSchedule(projectId, appId, scheduleId, body);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = AppParamsSchema.parse(req.params);
    const { scheduleId } = z.object({ scheduleId: z.uuid() }).parse(req.params);
    const { message } = await crawlScheduleService.deleteSchedule(projectId, appId, scheduleId);
    res.status(StatusCodes.OK).json({ message });
  } catch (err) {
    next(err);
  }
}
