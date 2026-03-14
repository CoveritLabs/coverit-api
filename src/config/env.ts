// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "3000", 10),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(","),
  JWT_SECRET: process.env.JWT_SECRET ?? "",
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? "15m",
  JWT_REFRESH_EXPIRY_SECONDS: parseInt(process.env.JWT_REFRESH_EXPIRY_SECONDS ?? "604800", 10), // 7 days
  RESET_CODE_TTL_SECONDS: parseInt(process.env.RESET_CODE_TTL_SECONDS ?? "900", 10), // 15 min
  API_PREFIX: process.env.API_PREFIX ?? "/api/v1",

  // OAuth
  OAUTH_FRONTEND_URL: process.env.OAUTH_FRONTEND_URL ?? "http://localhost:5173",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:3000/api/v1/auth/oauth/google/callback",
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? "",
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL ?? "http://localhost:3000/api/v1/auth/oauth/github/callback",

  // Emails
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  RESET_PASSWORD_EMAIL: process.env.RESET_PASSWORD_EMAIL ?? "Coverit <support@updates.coverit.cyou>",
  RESET_PASSWORD_TEMPLATE_ID: process.env.RESET_PASSWORD_TEMPLATE_ID ?? "",
} as const;
