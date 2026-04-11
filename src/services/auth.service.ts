// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import argon2 from "argon2";
import crypto from "crypto";

import { env } from "@config/env";
import { buildRedirectUrl } from "@utils/redirect";
import prisma from "@lib/prisma";
import { cacheDel, cacheGetString, cacheKeys, cacheScan, cacheSetString } from "@lib/cache";
import { emailQueue } from "@queues/email.queue";
import { BadRequestError, ConflictError, UnauthorizedError } from "@utils/errors";
import { generateAccessToken, generateRefreshToken, hashToken } from "@utils/token";
import { CACHE_LOG_CONTEXTS } from "@constants/logEvents";
import { AUTH_MESSAGES } from "@constants/messages";
import type { ForgotPasswordRequest, LoginRequest, LoginResponse, RefreshResponse, ResetPasswordRequest, SignupRequest } from "@models/auth";
import type { MessageResponse } from "@models/common";
import { logger } from "@services/logger.service";
import type { OAuthProvider } from "types/auth";

export async function signup(input: SignupRequest): Promise<MessageResponse> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError(AUTH_MESSAGES.EMAIL_TAKEN);
  }

  const hashedPassword = await argon2.hash(input.password);

  await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
    },
  });

  return { message: AUTH_MESSAGES.SIGNUP_SUCCESS };
}

export async function login(input: LoginRequest): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.password) {
    throw new UnauthorizedError(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

  const valid = await argon2.verify(user.password, input.password);
  if (!valid) {
    throw new UnauthorizedError(AUTH_MESSAGES.INVALID_CREDENTIALS);
  }

  const accessToken = generateAccessToken(user.id);
  const rawRefreshToken = generateRefreshToken();
  const hashedRefresh = hashToken(rawRefreshToken);

  await cacheSetString(
    cacheKeys.auth.refresh(user.id, hashedRefresh),
    "1",
    env.JWT_REFRESH_EXPIRY_SECONDS,
    CACHE_LOG_CONTEXTS.AUTH_WRITE_REFRESH_TOKEN,
  );

  return {
    tokens: { accessToken, refreshToken: rawRefreshToken },
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function refresh(oldRawToken: string): Promise<RefreshResponse> {
  const oldHash = hashToken(oldRawToken);
  const matchedKeys = await cacheScan(cacheKeys.auth.refreshByHashPattern(oldHash), CACHE_LOG_CONTEXTS.AUTH_SCAN_REFRESH_TOKEN);
  if (matchedKeys.length === 0) {
    throw new UnauthorizedError(AUTH_MESSAGES.REFRESH_TOKEN_INVALID);
  }

  const key = matchedKeys[0];
  const userId = key.split(":")[1];

  await cacheDel([key], CACHE_LOG_CONTEXTS.AUTH_DELETE_ROTATED_REFRESH_TOKEN);

  const accessToken = generateAccessToken(userId);
  const newRawRefresh = generateRefreshToken();
  const newHash = hashToken(newRawRefresh);

  await cacheSetString(cacheKeys.auth.refresh(userId, newHash), "1", env.JWT_REFRESH_EXPIRY_SECONDS, CACHE_LOG_CONTEXTS.AUTH_WRITE_NEW_REFRESH_TOKEN);

  return {
    message: AUTH_MESSAGES.REFRESH_SUCCESS,
    tokens: { accessToken, refreshToken: newRawRefresh },
  };
}

export async function logout(rawRefreshToken: string): Promise<MessageResponse> {
  const hash = hashToken(rawRefreshToken);
  const matchedKeys = await cacheScan(cacheKeys.auth.refreshByHashPattern(hash), CACHE_LOG_CONTEXTS.AUTH_SCAN_REFRESH_TOKEN);
  if (matchedKeys.length > 0) {
    await cacheDel([matchedKeys[0]], CACHE_LOG_CONTEXTS.AUTH_DELETE_REFRESH_TOKEN);
  }

  return { message: AUTH_MESSAGES.LOGOUT_SUCCESS };
}

export async function forgotPassword(input: ForgotPasswordRequest): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);

  await cacheSetString(cacheKeys.auth.reset(hashedToken), user.id, env.RESET_TOKEN_TTL_SECONDS, CACHE_LOG_CONTEXTS.AUTH_WRITE_RESET_TOKEN);

  const resetUrl = buildRedirectUrl(env.FRONTEND_URL, "/reset-password", { token: rawToken });

  logger.info(`[job:email] Enqueue password-reset email for userId=${user.id}`);
  await emailQueue.add("send-reset-email", {
    userId: user.id,
    email: user.email,
    name: user.name,
    resetUrl,
  });
}

export async function resetPassword(input: ResetPasswordRequest): Promise<MessageResponse> {
  const hashedToken = hashToken(input.token);
  const userId = await cacheGetString(cacheKeys.auth.reset(hashedToken), CACHE_LOG_CONTEXTS.AUTH_READ_RESET_TOKEN);

  if (!userId) {
    throw new BadRequestError(AUTH_MESSAGES.RESET_TOKEN_INVALID);
  }

  const hashedPassword = await argon2.hash(input.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  await cacheDel([cacheKeys.auth.reset(hashedToken)], CACHE_LOG_CONTEXTS.AUTH_DELETE_RESET_TOKEN);

  const refreshKeys = await cacheScan(cacheKeys.auth.refreshPattern(userId), CACHE_LOG_CONTEXTS.AUTH_SCAN_USER_REFRESH_TOKENS);
  await cacheDel(refreshKeys, CACHE_LOG_CONTEXTS.AUTH_DELETE_USER_REFRESH_TOKENS);

  return { message: AUTH_MESSAGES.RESET_PASSWORD_SUCCESS };
}

export async function oauthLogin(
  provider: OAuthProvider,
  profile: { email: string; name: string; providerAccountId: string },
): Promise<LoginResponse> {
  let user = await prisma.user.findUnique({ where: { email: profile.email } });

  if (user) {
    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id, provider },
    });

    if (!existingAccount) {
      await prisma.account.create({
        data: {
          userId: user.id,
          provider,
          providerAccountId: profile.providerAccountId,
        },
      });
    }
  } else {
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: profile.email,
          name: profile.name,
        },
      });

      await tx.account.create({
        data: {
          userId: newUser.id,
          provider,
          providerAccountId: profile.providerAccountId,
        },
      });

      return newUser;
    });
  }

  const accessToken = generateAccessToken(user.id);
  const rawRefreshToken = generateRefreshToken();
  const hashedRefresh = hashToken(rawRefreshToken);

  await cacheSetString(
    cacheKeys.auth.refresh(user.id, hashedRefresh),
    "1",
    env.JWT_REFRESH_EXPIRY_SECONDS,
    CACHE_LOG_CONTEXTS.AUTH_WRITE_OAUTH_REFRESH_TOKEN,
  );

  return {
    tokens: { accessToken, refreshToken: rawRefreshToken },
    user: { id: user.id, email: user.email, name: user.name },
  };
}
