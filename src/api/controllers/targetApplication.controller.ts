// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import * as targetService from "@services/targetApplication.service";

export async function createTargetApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const response = await targetService.createTargetApplication(projectId, req.body);
    res.status(StatusCodes.CREATED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateTargetApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = req.params;
    const response = await targetService.updateTargetApplication(projectId, appId, req.body);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteTargetApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = req.params;
    const response = await targetService.deleteTargetApplication(projectId, appId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getTargetApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const response = await targetService.getTargetApplications(projectId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getTargetApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = req.params;
    const response = await targetService.getTargetApplication(projectId, appId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function createVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = req.params;
    const response = await targetService.createTargetApplicationVersion(projectId, appId, req.body);
    res.status(StatusCodes.CREATED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, versionId } = req.params;
    const response = await targetService.deleteTargetApplicationVersion(projectId, appId, versionId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}
