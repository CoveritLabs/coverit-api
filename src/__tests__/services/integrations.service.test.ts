// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@lib/cache", () => ({
  cacheSetString: jest.fn(),
  cacheGetString: jest.fn(),
  cacheGetJSON: jest.fn().mockResolvedValue(null),
  cacheSetJSON: jest.fn(),
  cacheDel: jest.fn(),
  cacheKeys: {
    oauth: {
      integrationState: (provider: string, state: string) => `oauth:${provider}:state:${state}`,
    },
    user: {
      byId: (userId: string) => `user:${userId}`,
      byEmail: (email: string) => `user:${email}`,
    },
  },
}));
jest.mock("@config/env", () => ({
  env: {
    FRONTEND_URL: "https://app.example.com",
    ATLASSIAN_CLIENT_ID: "jira-client",
    ATLASSIAN_CLIENT_SECRET: "jira-secret",
    ATLASSIAN_CALLBACK_URL: "https://api.example.com/api/v1/oauth/jira/callback",
    OAUTH_TOKEN_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    OAUTH_STATE_TTL_SECONDS: 600,
  },
}));

import prisma from "@lib/prisma";
import * as cache from "@lib/cache";
import * as svc from "@services/integrations.service";
import { INTEGRATIONS_MESSAGES } from "@constants/messages";
import { decryptToken, encryptToken } from "@utils/crypto";

const mockPrisma = prisma as any;
const mockCache = cache as any;

describe("integrations.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCache.cacheGetJSON.mockResolvedValue(null);
    mockPrisma.project = { findUnique: jest.fn().mockResolvedValue({ id: "p1" }) };
    mockPrisma.user = {
      findUnique: jest.fn().mockResolvedValue({ id: "u1", email: "user@example.com", name: "User" }),
    };
    mockPrisma.projectIntegration = {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    };
    global.fetch = jest.fn();
  });

  test("startOAuth rejects unsupported providers", async () => {
    await expect(svc.startOAuth("p1", "u1", "linear")).rejects.toThrow(INTEGRATIONS_MESSAGES.UNSUPPORTED_PROVIDER);
  });

  test("completeOAuth rejects missing or expired state", async () => {
    mockCache.cacheGetString.mockResolvedValue(null);

    await expect(svc.completeOAuth("jira", "code", "state")).rejects.toThrow(INTEGRATIONS_MESSAGES.OAUTH_STATE_INVALID);
    expect(mockCache.cacheDel).toHaveBeenCalledWith(["oauth:jira:state:state"], expect.any(String));
  });

  test("completeOAuth rejects unsupported providers", async () => {
    await expect(svc.completeOAuth("linear", "code", "state")).rejects.toThrow(INTEGRATIONS_MESSAGES.UNSUPPORTED_PROVIDER);
  });

  test("completeOAuth exchanges code, selects Jira site, and upserts encrypted credentials", async () => {
    mockCache.cacheGetString.mockResolvedValue(
      JSON.stringify({
        projectId: "p1",
        userId: "u1",
        provider: "jira",
        createdAt: new Date().toISOString(),
      }),
    );

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "read:jira-work write:jira-work offline_access",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "cloud-1", url: "https://site.atlassian.net", name: "Site", scopes: ["read:jira-work"] }],
      });

    const redirectUrl = await svc.completeOAuth("jira", "code", "state");

    expect(redirectUrl).toBe("https://app.example.com/projects/p1/integrations?provider=jira&status=connected");
    expect(mockPrisma.projectIntegration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_provider: { projectId: "p1", provider: "JIRA" } },
        create: expect.objectContaining({
          projectId: "p1",
          provider: "JIRA",
          jiraCloudId: "cloud-1",
          jiraSiteUrl: "https://site.atlassian.net",
          authorizedByUserId: "u1",
        }),
      }),
    );

    const createData = mockPrisma.projectIntegration.upsert.mock.calls[0][0].create;
    expect(createData.encryptedAccessToken).not.toBe("access-token");
    expect(decryptToken(createData.encryptedAccessToken)).toBe("access-token");
    expect(decryptToken(createData.encryptedRefreshToken)).toBe("refresh-token");
  });

  test("completeOAuth rejects ambiguous Jira site selection", async () => {
    mockCache.cacheGetString.mockResolvedValue(
      JSON.stringify({
        projectId: "p1",
        userId: "u1",
        provider: "jira",
        createdAt: new Date().toISOString(),
      }),
    );

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "access-token", refresh_token: "refresh-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "cloud-1", url: "https://one.atlassian.net", scopes: ["read:jira-work"] },
          { id: "cloud-2", url: "https://two.atlassian.net", scopes: ["read:jira-work"] },
        ],
      });

    await expect(svc.completeOAuth("jira", "code", "state")).rejects.toThrow(INTEGRATIONS_MESSAGES.OAUTH_MULTIPLE_JIRA_SITES);
    expect(mockPrisma.projectIntegration.upsert).not.toHaveBeenCalled();
  });

  test("getIntegrationStatus returns non-secret disconnected and connected status", async () => {
    await expect(svc.getIntegrationStatus("p1", "jira")).resolves.toEqual({
      connected: false,
      provider: "jira",
      scopes: [],
      details: { case: undefined },
      reportingConfig: { case: undefined },
    });

    const expiresAt = new Date("2026-06-19T12:00:00.000Z");
    mockPrisma.projectIntegration.findUnique.mockResolvedValueOnce({
      jiraCloudId: "cloud-1",
      jiraSiteName: "Site",
      jiraSiteUrl: "https://site.atlassian.net",
      scopes: ["read:jira-work"],
      authorizedByUserId: "u1",
      accessTokenExpiresAt: expiresAt,
      refreshedAt: null,
      createdAt: expiresAt,
      updatedAt: expiresAt,
      encryptedAccessToken: "secret",
    });

    const status = await svc.getIntegrationStatus("p1", "jira");
    expect(status).toMatchObject({
      connected: true,
      provider: "jira",
      authorizedByUser: { id: "u1", email: "user@example.com", name: "User" },
      reportingConfig: { case: "jiraReportingConfig", value: { enabled: false } },
      details: {
        case: "jira",
        value: {
          cloudId: "cloud-1",
          siteName: "Site",
          siteUrl: "https://site.atlassian.net",
        },
      },
    });
    expect(status).not.toHaveProperty("encryptedAccessToken");
  });

  test("getIntegrationStatus rejects unsupported providers", async () => {
    await expect(svc.getIntegrationStatus("p1", "linear")).rejects.toThrow(INTEGRATIONS_MESSAGES.UNSUPPORTED_PROVIDER);
  });

  test("disconnectIntegration deletes the Jira project integration", async () => {
    const response = await svc.disconnectIntegration("p1", "jira");

    expect(response.message).toBe(INTEGRATIONS_MESSAGES.JIRA_DISCONNECT_SUCCESS);
    expect(mockPrisma.projectIntegration.deleteMany).toHaveBeenCalledWith({ where: { projectId: "p1", provider: "JIRA" } });
  });

  test("disconnectIntegration rejects unsupported providers", async () => {
    await expect(svc.disconnectIntegration("p1", "linear")).rejects.toThrow(INTEGRATIONS_MESSAGES.UNSUPPORTED_PROVIDER);
  });

  test("getValidJiraAccess refreshes expired access tokens and stores rotated refresh token", async () => {
    mockPrisma.projectIntegration.findUnique.mockResolvedValue({
      id: "integration-1",
      jiraCloudId: "cloud-1",
      jiraSiteUrl: "https://site.atlassian.net",
      tokenType: "Bearer",
      encryptedAccessToken: encryptToken("old-access"),
      encryptedRefreshToken: encryptToken("old-refresh"),
      accessTokenExpiresAt: new Date(Date.now() - 1000),
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
        token_type: "Bearer",
        scope: "read:jira-work write:jira-work offline_access",
      }),
    });

    const access = await svc.getValidJiraAccess("p1");

    expect(access).toMatchObject({ accessToken: "new-access", cloudId: "cloud-1" });
    expect(mockPrisma.projectIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "integration-1" },
        data: expect.objectContaining({
          scopes: ["read:jira-work", "write:jira-work", "offline_access"],
          refreshedAt: expect.any(Date),
        }),
      }),
    );
    const updateData = mockPrisma.projectIntegration.update.mock.calls[0][0].data;
    expect(decryptToken(updateData.encryptedRefreshToken)).toBe("new-refresh");
  });
});
