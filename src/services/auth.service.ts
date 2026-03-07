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

import type { SignupInput, LoginInput, TokenPair, UserInfo, ResetPasswordInput } from '../types/auth';

export async function signup(input: SignupInput): Promise<void> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
        throw new ConflictError('Email already registered');
    }

    const hashedPassword = await argon2.hash(input.password);

    await prisma.user.create({
        data: {
            email: input.email,
            password: hashedPassword,
            name: input.name,
        },
    });
}

export async function login(input: LoginInput): Promise<{ tokens: TokenPair; user: UserInfo }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await argon2.verify(user.password, input.password);
    if (!valid) {
        throw new UnauthorizedError('Invalid email or password');
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

export async function refresh(oldRawToken: string): Promise<TokenPair> {
    const oldHash = hashToken(oldRawToken);
    const matchedKeys = await scanKeys(`refresh:*:${oldHash}`);
    if (matchedKeys.length === 0) {
        throw new UnauthorizedError('Invalid or expired refresh token');
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

    return { accessToken, refreshToken: newRawRefresh };
}

export async function logout(rawRefreshToken: string): Promise<void> {
    const hash = hashToken(rawRefreshToken);
    const matchedKeys = await scanKeys(`refresh:*:${hash}`);
    if (matchedKeys.length > 0) {
        await redis.del(matchedKeys[0]);
    }
}

export async function forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const hashed = hashToken(rawToken);

    await redis.set(resetKey(hashed), user.id, 'EX', env.RESET_TOKEN_TTL_SECONDS);

    // TODO: replace with email job enqueue
    console.info(`[job:email] Enqueue password-reset email for userId=${user.id} token=${rawToken}`);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
    const hashed = hashToken(input.token);
    const userId = await redis.get(resetKey(hashed));

    if (!userId) {
        throw new BadRequestError('Invalid or expired reset token');
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
}
