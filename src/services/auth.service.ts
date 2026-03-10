// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import crypto from 'crypto';
import argon2 from 'argon2';

import prisma from '@lib/prisma';
import redis, { scanKeys, refreshKey, refreshPattern, resetKey } from '@lib/redis';
import { env } from '@config/env';
import { BadRequestError, ConflictError, UnauthorizedError } from '@utils/errors';
import { generateAccessToken, generateRefreshToken, hashToken } from '@utils/token';

import type {
    SignupRequest,
    LoginRequest,
    LoginResponse,
    RefreshResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
} from '@models/auth';
import type { MessageResponse } from '@models/common';
import { AUTH_MESSAGES } from '@constants/messages';
import type { OAuthProvider } from 'types/auth';


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

    await redis.set(
        refreshKey(user.id, hashedRefresh),
        '1',
        'EX',
        env.JWT_REFRESH_EXPIRY_SECONDS,
    );

    return {
        tokens: { accessToken, refreshToken: rawRefreshToken },
        user: { id: user.id, email: user.email, name: user.name },
    };
}

export async function refresh(oldRawToken: string): Promise<RefreshResponse> {
    const oldHash = hashToken(oldRawToken);
    const matchedKeys = await scanKeys(`refresh:*:${oldHash}`);
    if (matchedKeys.length === 0) {
        throw new UnauthorizedError(AUTH_MESSAGES.REFRESH_TOKEN_INVALID);
    }

    const key = matchedKeys[0];
    const userId = key.split(':')[1];

    await redis.del(key);

    const accessToken = generateAccessToken(userId);
    const newRawRefresh = generateRefreshToken();
    const newHash = hashToken(newRawRefresh);

    await redis.set(
        refreshKey(userId, newHash),
        '1',
        'EX',
        env.JWT_REFRESH_EXPIRY_SECONDS,
    );

    return {
        message: AUTH_MESSAGES.REFRESH_SUCCESS,
        tokens: { accessToken, refreshToken: newRawRefresh },
    };
}

export async function logout(rawRefreshToken: string): Promise<MessageResponse> {
    const hash = hashToken(rawRefreshToken);
    const matchedKeys = await scanKeys(`refresh:*:${hash}`);
    if (matchedKeys.length > 0) {
        await redis.del(matchedKeys[0]);
    }

    return { message: AUTH_MESSAGES.LOGOUT_SUCCESS };
}

export async function forgotPassword(input: ForgotPasswordRequest): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const hashed = hashToken(rawToken);

    await redis.set(resetKey(hashed), user.id, 'EX', env.RESET_TOKEN_TTL_SECONDS);

    // TODO: replace with email job enqueue
    console.info(`[job:email] Enqueue password-reset email for userId=${user.id} token=${rawToken}`);
}

export async function resetPassword(input: ResetPasswordRequest): Promise<MessageResponse> {
    const hashed = hashToken(input.token);
    const userId = await redis.get(resetKey(hashed));

    if (!userId) {
        throw new BadRequestError(AUTH_MESSAGES.RESET_TOKEN_INVALID);
    }

    const hashedPassword = await argon2.hash(input.newPassword);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    await redis.del(resetKey(hashed));

    const refreshKeys = await scanKeys(refreshPattern(userId));
    if (refreshKeys.length > 0) {
        await redis.del(...refreshKeys);
    }

    return { message: AUTH_MESSAGES.RESET_PASSWORD_SUCCESS };
}

export async function oauthLogin(
    provider: OAuthProvider,
    profile: { email: string; name: string },
): Promise<LoginResponse> {
    let user = await prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: profile.email,
                name: profile.name,
                provider,
            },
        });
    }

    const accessToken = generateAccessToken(user.id);
    const rawRefreshToken = generateRefreshToken();
    const hashedRefresh = hashToken(rawRefreshToken);

    await redis.set(
        refreshKey(user.id, hashedRefresh),
        '1',
        'EX',
        env.JWT_REFRESH_EXPIRY_SECONDS,
    );

    return {
        tokens: { accessToken, refreshToken: rawRefreshToken },
        user: { id: user.id, email: user.email, name: user.name },
    };
}
