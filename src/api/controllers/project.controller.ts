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
    req.recordProjectActivity?.({
      projectId: response.id,
      eventType: "project.created",
      entityType: "project",
      entityId: response.id,
      message: `Created project ${req.body.name}`,
    });
    res.status(StatusCodes.CREATED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;

    const response = await projectService.updateProject(projectId, req.body);
    req.recordProjectActivity?.({
      projectId,
      eventType: "project.updated",
      entityType: "project",
      entityId: projectId,
      message: "Updated project details",
      metadata: { name: req.body.name },
    });
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
    req.recordProjectActivity?.({
      projectId,
      eventType: "project.members_added",
      entityType: "project_member",
      message: `Added ${req.body.members.length} project member${req.body.members.length === 1 ? "" : "s"}`,
      metadata: { emails: req.body.members.map((member: { email: string }) => member.email) },
    });
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateProjectMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getCurrentUserId(req);
    const { projectId } = req.params;

    const response = await projectService.updateMember(projectId, req.body, userId);
    req.recordProjectActivity?.({
      projectId,
      eventType: "project.member_updated",
      entityType: "project_member",
      entityId: req.body.id,
      message: "Updated project member role",
      metadata: { role: req.body.role },
    });
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function removeProjectMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;

    const response = await projectService.removeMembers(projectId, req.body);
    req.recordProjectActivity?.({
      projectId,
      eventType: "project.members_removed",
      entityType: "project_member",
      message: `Removed ${req.body.emails.length} project member${req.body.emails.length === 1 ? "" : "s"}`,
      metadata: { emails: req.body.emails },
    });
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function leaveProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = getCurrentUserId(req);

    const response = await projectService.leaveProject(projectId, userId);
    req.recordProjectActivity?.({
      projectId,
      eventType: "project.left",
      entityType: "project_member",
      entityId: userId,
      message: "Left project",
    });
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}
