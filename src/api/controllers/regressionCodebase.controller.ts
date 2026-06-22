// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import * as rcService from "@services/regressionCodebase.service";

export async function createRegressionCodebase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appId } = req.params;
    const response = await rcService.createRegressionCodebase(appId, req.body);
    res.status(StatusCodes.CREATED).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateRegressionCodebase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appId, codebaseId } = req.params;
    const response = await rcService.updateRegressionCodebase(appId, codebaseId, req.body);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteRegressionCodebase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appId, codebaseId } = req.params;
    const response = await rcService.deleteRegressionCodebase(appId, codebaseId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getRegressionCodebases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appId } = req.params;
    const response = await rcService.getRegressionCodebasesByApp(appId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getRegressionCodebase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { appId, codebaseId } = req.params;
    const response = await rcService.getRegressionCodebase(appId, codebaseId);
    res.status(StatusCodes.OK).json(response);
  } catch (err) {
    next(err);
  }
}
