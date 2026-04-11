// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

describe("env module console output", () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = { ...OLD_ENV };
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("console.info is invoked when env vars missing", () => {
    delete process.env.DATABASE_URL;
    jest.resetModules();
    const spy = jest.spyOn(console, "info").mockImplementation(() => undefined as any);
    require("@config/env");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("console.info is invoked when env vars present (masked)", () => {
    process.env.DATABASE_URL = "postgres://x";
    process.env.GOOGLE_CLIENT_ID = "g";
    process.env.GOOGLE_CLIENT_SECRET = "gs";
    process.env.JWT_SECRET = "s";
    jest.resetModules();
    const spy = jest.spyOn(console, "info").mockImplementation(() => undefined as any);
    require("@config/env");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

describe("config/env", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {}; // Clear environment to force defaults
    // suppress console.info
    jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test("loads correct defaults when process.env variables are missing", async () => {
    const { env } = await import("@config/env");

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe("");
    expect(env.REDIS_URL).toBe("redis://localhost:6379");
    expect(env.CORS_ORIGINS).toEqual(["http://localhost:5173"]);
    expect(env.CORS_CREDENTIALS).toBe("true");
    expect(env.JWT_SECRET).toBe("");
    expect(env.JWT_ACCESS_EXPIRY).toBe("15m");
    expect(env.JWT_REFRESH_EXPIRY_SECONDS).toBe(604800);
    expect(env.RESET_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.API_PREFIX).toBe("/api/v1");

    expect(env.FRONTEND_URL).toBe("http://localhost:5173");
    expect(env.GOOGLE_CLIENT_ID).toBe("");
    expect(env.GITHUB_CLIENT_ID).toBe("");
    expect(console.info).toHaveBeenCalled();
  });

  test("loads provided values overriding defaults", async () => {
    process.env.PORT = "4000";
    process.env.CORS_ORIGINS = "https://a.com,https://b.com";

    const { env } = await import("@config/env");
    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual(["https://a.com", "https://b.com"]);
  });
});
