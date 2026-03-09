// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { Request, Response, NextFunction } from 'express';
import * as authService from '@services/auth.service';
import { AUTH_MESSAGES } from '@constants/messages';


export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password, name } = req.body;
        const response = await authService.signup({ email, password, name });
        res.status(201).json(response);
    } catch (err) {
        next(err);
    }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password } = req.body;
        const response = await authService.login({ email, password });
        res.status(200).json(response);
    } catch (err) {
        next(err);
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { refreshToken } = req.body;
        const response = await authService.refresh(refreshToken);
        res.status(200).json(response);
    } catch (err) {
        next(err);
    }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            const response = await authService.logout(refreshToken);
            res.status(200).json(response);
        } else {
            res.status(200).json({ message: AUTH_MESSAGES.LOGOUT_SUCCESS });
        }
    } catch (err) {
        next(err);
    }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email } = req.body;
        authService.forgotPassword({ email }).catch((err) => {
            console.error('Error processing forgot-password:', err);
        });
        res.status(200).json({ message: AUTH_MESSAGES.FORGOT_PASSWORD_SENT });
    } catch (err) {
        next(err);
    }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { token, newPassword } = req.body;
        const response = await authService.resetPassword({ token, newPassword });
        res.status(200).json(response);
    } catch (err) {
        next(err);
    }
}
