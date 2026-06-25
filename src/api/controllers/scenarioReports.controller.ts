// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { getCurrentUserId } from "@api/middlewares/requireAuth";
import {
  CreateScenarioIntegrationReportBodySchema,
  InternalClaimScenarioReportBodySchema,
  InternalCreateManualBugReportBodySchema,
  InternalPatchScenarioReportBodySchema,
} from "@models/scenarioReports";
import * as scenarioReportsService from "@services/scenarioReports.service";

export async function createScenarioReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, appId, runId, scenarioId, provider } = req.params;
    const userId = getCurrentUserId(req);
    const body = CreateScenarioIntegrationReportBodySchema.parse(req.body);
    const response = await scenarioReportsService.createScenarioReport(projectId, appId, runId, scenarioId, provider, userId, body);
    req.recordProjectActivity?.({
      projectId,
      eventType: "scenario_report.created",
      entityType: "scenario_integration_report",
      entityId: response.report.id,
      message: `Created ${provider} scenario report`,
      metadata: { applicationId: appId, runId, scenarioId, provider },
    });
    res.status(StatusCodes.ACCEPTED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function claimScenarioReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    scenarioReportsService.assertInternalServiceToken(req.headers["x-coverit-internal-token"]);
    const body = InternalClaimScenarioReportBodySchema.parse(req.body);
    const response = await scenarioReportsService.claimScenarioReport(body);
    if (!response) {
      res.status(StatusCodes.NO_CONTENT).send();
      return;
    }
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function createManualBugReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    scenarioReportsService.assertInternalServiceToken(req.headers["x-coverit-internal-token"]);
    const body = InternalCreateManualBugReportBodySchema.parse(req.body);
    const response = await scenarioReportsService.createManualBugReport(body);
    res.status(StatusCodes.ACCEPTED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getScenarioReportContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    scenarioReportsService.assertInternalServiceToken(req.headers["x-coverit-internal-token"]);
    const response = await scenarioReportsService.getScenarioReportContext(req.params.reportId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function downloadScenarioReportArtifact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    scenarioReportsService.assertInternalServiceToken(req.headers["x-coverit-internal-token"]);
    const artifact = await scenarioReportsService.downloadScenarioReportArtifact(req.params.reportId, req.params.artifactId);
    res.setHeader("Content-Type", artifact.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${artifact.name.replace(/"/g, "")}"`);
    res.status(StatusCodes.OK).send(artifact.content);
  } catch (err) {
    next(err);
  }
}

export async function patchScenarioReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    scenarioReportsService.assertInternalServiceToken(req.headers["x-coverit-internal-token"]);
    const body = InternalPatchScenarioReportBodySchema.parse(req.body);
    const response = await scenarioReportsService.patchScenarioReport(req.params.reportId, body);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}
