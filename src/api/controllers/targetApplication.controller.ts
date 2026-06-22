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
    req.recordProjectActivity?.({
      projectId,
      eventType: "target_application.created",
      entityType: "target_application",
      entityId: response.id,
      message: `Created target application ${req.body.name}`,
    });
    res.status(StatusCodes.CREATED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateTargetApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = req.params;
    const response = await targetService.updateTargetApplication(projectId, appId, req.body);
    req.recordProjectActivity?.({
      projectId,
      eventType: "target_application.updated",
      entityType: "target_application",
      entityId: appId,
      message: "Updated target application",
      metadata: { name: req.body.name, baseUrl: req.body.baseUrl },
    });
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteTargetApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = req.params;
    const response = await targetService.deleteTargetApplication(projectId, appId);
    req.recordProjectActivity?.({
      projectId,
      eventType: "target_application.deleted",
      entityType: "target_application",
      entityId: appId,
      message: "Deleted target application",
    });
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
    req.recordProjectActivity?.({
      projectId,
      eventType: "target_application.version_created",
      entityType: "target_application_version",
      entityId: response.id,
      message: `Created application version ${req.body.version}`,
      metadata: { applicationId: appId },
    });
    res.status(StatusCodes.CREATED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, versionId } = req.params;
    const response = await targetService.deleteTargetApplicationVersion(projectId, appId, versionId);
    req.recordProjectActivity?.({
      projectId,
      eventType: "target_application.version_deleted",
      entityType: "target_application_version",
      entityId: versionId,
      message: "Deleted application version",
      metadata: { applicationId: appId },
    });
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function rotateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = req.params;
    const response = await targetService.rotateTargetApplicationApiKey(projectId, appId);
    req.recordProjectActivity?.({
      projectId,
      eventType: "target_application.api_key_rotated",
      entityType: "target_application",
      entityId: appId,
      message: "Rotated target application API key",
    });
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}
