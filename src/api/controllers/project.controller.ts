// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import * as projectService from "@services/project.service";
import { getCurrentUserId } from "@api/middlewares/requireAuth";

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getCurrentUserId(req);
    const response = await projectService.createProject(userId, req.body);
    res.status(StatusCodes.CREATED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;

    const response = await projectService.updateProject(projectId, req.body);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;

    const response = await projectService.deleteProject(projectId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getCurrentUserId(req);
    const response = await projectService.getProjects(userId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;

    const response = await projectService.getProject(projectId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function addProjectMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;

    const response = await projectService.addMembers(projectId, req.body);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateProjectMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;

    const response = await projectService.updateMember(projectId, req.body);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function removeProjectMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;

    const response = await projectService.removeMembers(projectId, req.body);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}
