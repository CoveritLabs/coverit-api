// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Auth domain DTOs

import { z } from 'zod';
import type {
    SignupRequest as ContractSignupRequest,
    LoginRequest as ContractLoginRequest,
    ForgotPasswordRequest as ContractForgotPasswordRequest,
    ResetPasswordRequest as ContractResetPasswordRequest,
    RefreshRequest as ContractRefreshRequest,
    LoginResponse as ContractLoginResponse,
    RefreshResponse as ContractRefreshResponse,
    TokenPair as ContractTokenPair,
} from '@coveritlabs/contracts';
import type { Plain } from './common';

export type SignupRequest = Plain<ContractSignupRequest>;
export type LoginRequest = Plain<ContractLoginRequest>;
export type LoginResponse = Plain<ContractLoginResponse>;
export type RefreshResponse = Plain<ContractRefreshResponse>;
export type ForgotPasswordRequest = Plain<ContractForgotPasswordRequest>;
export type ResetPasswordRequest = Plain<ContractResetPasswordRequest>;
export type TokenPair = Plain<ContractTokenPair>;
export type RefreshRequest = Plain<ContractRefreshRequest>;

export const SignupRequestSchema = z.object({
    email: z.email('Invalid email address'),
    password: z.string().trim().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required'),
}) satisfies z.ZodType<SignupRequest>;

export const LoginRequestSchema = z.object({
    email: z.email('Invalid email address'),
    password: z.string().trim().min(1, 'Password is required'),
}) satisfies z.ZodType<LoginRequest>;

export const ForgotPasswordRequestSchema = z.object({
    email: z.email('Invalid email address'),
}) satisfies z.ZodType<ForgotPasswordRequest>;

export const ResetPasswordRequestSchema = z.object({
    token: z.string().trim().min(1, 'Reset token is required'),
    newPassword: z.string().trim().min(8, 'Password must be at least 8 characters'),
}) satisfies z.ZodType<ResetPasswordRequest>;

export const RefreshRequestSchema = z.object({
    refreshToken: z.string().trim().min(1, 'Refresh token is required'),
}) satisfies z.ZodType<RefreshRequest>;
