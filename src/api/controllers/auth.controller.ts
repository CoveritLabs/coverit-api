// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from 'express';
import * as authService from '@services/auth.service';


export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password, name } = req.body;
        await authService.signup({ email, password, name });
        res.status(201).json({ message: 'Account created successfully' });
    } catch (err) {
        next(err);
    }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password } = req.body;
        const { tokens, user } = await authService.login({ email, password });
        res.status(200).json({ user, tokens });
    } catch (err) {
        next(err);
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(401).json({ message: 'Missing refresh token' });
            return;
        }
        const tokens = await authService.refresh(refreshToken);
        res.status(200).json({ message: 'Tokens refreshed', tokens });
    } catch (err) {
        next(err);
    }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await authService.logout(refreshToken);
        }
        res.status(200).json({ message: 'Logged out' });
    } catch (err) {
        next(err);
    }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email } = req.body;
        // Fire-and-forget: do not await so the response returns immediately
        authService.forgotPassword(email).catch((err) => {
            console.error('Error processing forgot-password:', err);
        });
        res.status(200).json({ message: 'If an account with that email exists, a reset link was sent' });
    } catch (err) {
        next(err);
    }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { token, newPassword } = req.body;
        await authService.resetPassword({ token, newPassword });
        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        next(err);
    }
}
