// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Auth domain DTOs

import type {
    SignupRequest as ContractSignupRequest,
    LoginRequest as ContractLoginRequest,
    LoginResponse as ContractLoginResponse,
    RefreshResponse as ContractRefreshResponse,
    ForgotPasswordRequest as ContractForgotPasswordRequest,
    ResetPasswordRequest as ContractResetPasswordRequest,
    TokenPair as ContractTokenPair,
} from '@coveritlabs/contracts';

// Auth-specific models
import type { Plain } from './common';

export type SignupRequest = Plain<ContractSignupRequest>;
export type LoginRequest = Plain<ContractLoginRequest>;
export type LoginResponse = Plain<ContractLoginResponse>;
export type RefreshResponse = Plain<ContractRefreshResponse>;
export type ForgotPasswordRequest = Plain<ContractForgotPasswordRequest>;
export type ResetPasswordRequest = Plain<ContractResetPasswordRequest>;
export type TokenPair = Plain<ContractTokenPair>;
