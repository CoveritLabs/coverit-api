// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@utils/token";
import { UnauthorizedError } from "@utils/errors";
import { AUTH_MESSAGES } from "@constants/messages";

export function getCurrentUserId(req: Request): string {
  if (!req.userId) {
    throw new UnauthorizedError(AUTH_MESSAGES.AUTH_REQUIRED);
  }

  return req.userId;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedError(AUTH_MESSAGES.AUTH_REQUIRED);
    }
    const token = header.slice(7);
    req.userId = verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError(AUTH_MESSAGES.ACCESS_TOKEN_INVALID));
  }
}
