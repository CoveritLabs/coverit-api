// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export const env = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: parseInt(process.env.PORT ?? '3000', 10),
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
    JWT_SECRET: process.env.JWT_SECRET ?? '',
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? '15m',
    JWT_REFRESH_EXPIRY_SECONDS: parseInt(process.env.JWT_REFRESH_EXPIRY_SECONDS ?? '604800', 10), // 7 days
    RESET_TOKEN_TTL_SECONDS: parseInt(process.env.RESET_TOKEN_TTL_SECONDS ?? '900', 10), // 15 min
    API_PREFIX: process.env.API_PREFIX ?? '/api/v1',
} as const;
