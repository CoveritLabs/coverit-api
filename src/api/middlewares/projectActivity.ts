// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { NextFunction, Request, Response } from "express";
import { recordProjectActivities, type ProjectActivityInput } from "@services/projectActivity.service";

function isSuccessfulStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 400;
}

export function projectActivityRecorder(req: Request, res: Response, next: NextFunction): void {
  const events: ProjectActivityInput[] = [];

  req.recordProjectActivity = (event: ProjectActivityInput) => {
    events.push(event);
  };

  res.on("finish", () => {
    if (!isSuccessfulStatus(res.statusCode) || events.length === 0) return;
    void recordProjectActivities(events, req.userId);
  });

  next();
}
