// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import * as crawlService from "@services/crawlSession.service";
import { StatusCodes } from "http-status-codes";
import { AppVersionParamsSchema, CrawlSessionParamsSchema, CreateCrawlSessionRequestSchema, GetSessionsQuerySchema } from "@models/crawlSession";

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId } = AppVersionParamsSchema.parse(req.params);
    const query = GetSessionsQuerySchema.parse(req.query);
    const result = await crawlService.getSessions(projectId, appId, versionId, query);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId } = AppVersionParamsSchema.parse(req.params);
    const body = CreateCrawlSessionRequestSchema.parse(req.body);
    const result = await crawlService.createSession(projectId, appId, versionId, body);
    res.status(StatusCodes.CREATED).json(result);
  } catch (e) {
    next(e);
  }
};

export const getSessionDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId, crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
    const result = await crawlService.getSessionDetails(projectId, appId, versionId, crawlSessionId);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const deleteSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId, crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
    const { message } = await crawlService.deleteSession(projectId, appId, versionId, crawlSessionId);
    res.status(StatusCodes.OK).json({ message });
  } catch (e) {
    next(e);
  }
};

export const startSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId, crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
    const { message } = await crawlService.startSession(projectId, appId, versionId, crawlSessionId);
    res.status(StatusCodes.OK).json({ message });
  } catch (e) {
    next(e);
  }
};

export const abortSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId, crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
    const { message } = await crawlService.abortSession(projectId, appId, versionId, crawlSessionId);
    res.status(StatusCodes.OK).json({ message });
  } catch (e) {
    next(e);
  }
};

export const pauseSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, appId, versionId, crawlSessionId } = CrawlSessionParamsSchema.parse(req.params);
    const { message } = await crawlService.pauseSession(projectId, appId, versionId, crawlSessionId);
    res.status(StatusCodes.OK).json({ message });
  } catch (e) {
    next(e);
  }
};
