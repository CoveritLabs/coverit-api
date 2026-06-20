// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { env } from "@config/env";
import { getCurrentUserId } from "@api/middlewares/requireAuth";
import { INTEGRATIONS_MESSAGES } from "@constants/messages";
import { UpdateIntegrationReportingConfigBodySchema } from "@models/integrations";
import * as integrationsService from "@services/integrations.service";
import { buildRedirectUrl } from "@utils/redirect";

export async function startOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, provider } = req.params;
    const userId = getCurrentUserId(req);
    const response = await integrationsService.startOAuth(projectId, userId, provider);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getIntegrationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, provider } = req.params;
    const response = await integrationsService.getIntegrationStatus(projectId, provider);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getReportingOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, provider } = req.params;
    const response = await integrationsService.getReportingOptions(projectId, provider);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateReportingConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, provider } = req.params;
    const body = UpdateIntegrationReportingConfigBodySchema.parse(req.body);
    const response = await integrationsService.updateReportingConfig(projectId, provider, body);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function disconnectIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, provider } = req.params;
    const response = await integrationsService.disconnectIntegration(projectId, provider);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function oauthCallback(req: Request, res: Response): Promise<void> {
  const provider = req.params.provider;
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const oauthError = req.query.error as string | undefined;
  const projectId = req.query.projectId as string | undefined;

  if (oauthError || !code || !state) {
    const message = oauthError === "access_denied" ? INTEGRATIONS_MESSAGES.OAUTH_CANCELLED : INTEGRATIONS_MESSAGES.OAUTH_CODE_MISSING;
    const pathname = projectId ? `/projects/${projectId}/integrations` : "/integrations";
    const errorRedirect = buildRedirectUrl(env.FRONTEND_URL, pathname, { error: message, provider });
    res.redirect(errorRedirect);
    return;
  }

  try {
    const redirectUrl = await integrationsService.completeOAuth(provider, code, state);
    res.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : INTEGRATIONS_MESSAGES.OAUTH_FAILED;
    const pathname = projectId ? `/projects/${projectId}/integrations` : "/integrations";
    const errorRedirect = buildRedirectUrl(env.FRONTEND_URL, pathname, { error: message, provider });
    res.redirect(errorRedirect);
  }
}
