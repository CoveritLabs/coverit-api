// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export interface SignupInput {
    email: string;
    password: string;
    name: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface UserInfo {
    id: string;
    email: string;
    name: string;
}

export interface ResetPasswordInput {
    token: string;
    newPassword: string;
}
