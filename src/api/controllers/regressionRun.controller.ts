// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import {
  RegressionCompleteBodySchema,
  RegressionArtifactListQuerySchema,
  RegressionArtifactUploadFieldsSchema,
  RegressionEventListQuerySchema,
  RegressionEventsIngestBodySchema,
  RegressionRunListQuerySchema,
} from "@models/regressionRun";
import * as regressionRunService from "@services/regressionRun.service";
import { BadRequestError } from "@utils/errors";

export async function ingestEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { runId } = req.params;
    const body = RegressionEventsIngestBodySchema.parse(req.body);
    const response = await regressionRunService.ingestEvents(req.headers["x-coverit-api-key"], runId, body);
    res.status(StatusCodes.ACCEPTED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function completeRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { runId } = req.params;
    const body = RegressionCompleteBodySchema.parse(req.body);
    const response = await regressionRunService.completeRun(req.headers["x-coverit-api-key"], runId, body);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function listRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId } = req.params;
    const query = RegressionRunListQuerySchema.parse(req.query);
    const response = await regressionRunService.listRuns(projectId, appId, query);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, runId } = req.params;
    const response = await regressionRunService.getRun(projectId, appId, runId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function listScenarios(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, runId } = req.params;
    const response = await regressionRunService.listScenarios(projectId, appId, runId);
    res.status(StatusCodes.OK).json({ scenarios: response });
  } catch (err) {
    next(err);
  }
}

export async function getScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, runId, scenarioId } = req.params;
    const response = await regressionRunService.getScenario(projectId, appId, runId, scenarioId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function listScenarioEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, runId, scenarioId } = req.params;
    const query = RegressionEventListQuerySchema.parse(req.query);
    const response = await regressionRunService.listScenarioEvents(projectId, appId, runId, scenarioId, query);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function uploadArtifact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { runId } = req.params;
    const file = toArtifactFile(req.file);
    const fields = RegressionArtifactUploadFieldsSchema.parse(req.body);
    const response = await regressionRunService.uploadArtifact(req.headers["x-coverit-api-key"], runId, fields, file);
    res.status(StatusCodes.ACCEPTED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function listArtifacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, runId } = req.params;
    const query = RegressionArtifactListQuerySchema.parse(req.query);
    const response = await regressionRunService.listArtifacts(projectId, appId, runId, query);
    res.status(StatusCodes.OK).json({ artifacts: response });
  } catch (err) {
    next(err);
  }
}

export async function listScenarioArtifacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, runId, scenarioId } = req.params;
    const query = RegressionArtifactListQuerySchema.parse(req.query);
    const response = await regressionRunService.listScenarioArtifacts(projectId, appId, runId, scenarioId, query);
    res.status(StatusCodes.OK).json({ artifacts: response });
  } catch (err) {
    next(err);
  }
}

export async function getArtifact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, runId, artifactId } = req.params;
    const response = await regressionRunService.getArtifact(projectId, appId, runId, artifactId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function downloadArtifact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, runId, artifactId } = req.params;
    const artifact = await regressionRunService.downloadArtifact(projectId, appId, runId, artifactId);
    res.setHeader("Content-Type", artifact.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${artifact.name.replace(/"/g, "")}"`);
    res.status(StatusCodes.OK).send(artifact.content);
  } catch (err) {
    next(err);
  }
}

function toArtifactFile(file: Express.Multer.File | undefined) {
  if (!file) throw new BadRequestError("multipart artifact file is required");
  return {
    buffer: file.buffer,
    originalName: file.originalname || "artifact",
    contentType: file.mimetype,
    size: file.size,
  };
}
