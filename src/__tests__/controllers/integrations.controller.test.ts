// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import express from "express";
import request from "supertest";

jest.mock("@services/integrations.service");
jest.mock("@api/middlewares/requireAuth", () => ({ getCurrentUserId: jest.fn() }));
jest.mock("@utils/redirect", () => ({ buildRedirectUrl: jest.fn() }));

import { getCurrentUserId } from "@api/middlewares/requireAuth";
import * as controller from "@api/controllers/integrations.controller";
import { INTEGRATIONS_MESSAGES } from "@constants/messages";
import * as integrationsService from "@services/integrations.service";
import { buildRedirectUrl } from "@utils/redirect";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.post("/projects/:projectId/integrations/:provider/oauth", controller.startOAuth);
  app.get("/projects/:projectId/integrations/:provider", controller.getIntegrationStatus);
  app.delete("/projects/:projectId/integrations/:provider", controller.disconnectIntegration);
  app.get("/oauth/:provider/callback", controller.oauthCallback);
  return app;
}

describe("integrations.controller", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.resetAllMocks();
    app = makeApp();
    (getCurrentUserId as jest.Mock).mockReturnValue("u1");
    (buildRedirectUrl as jest.Mock).mockImplementation((baseUrl: string, pathname: string, query: Record<string, string>) => {
      const url = new URL(pathname, baseUrl);
      Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
      return url.toString();
    });
  });

  test("startOAuth returns authorization URL", async () => {
    (integrationsService.startOAuth as jest.Mock).mockResolvedValue({ authorizationUrl: "https://auth.atlassian.com/authorize" });

    const res = await request(app).post("/projects/p1/integrations/jira/oauth");

    expect(res.status).toBe(200);
    expect(res.body.authorizationUrl).toBe("https://auth.atlassian.com/authorize");
    expect(integrationsService.startOAuth).toHaveBeenCalledWith("p1", "u1", "jira");
  });

  test("getIntegrationStatus returns status", async () => {
    (integrationsService.getIntegrationStatus as jest.Mock).mockResolvedValue({ connected: false, provider: "jira", scopes: [] });

    const res = await request(app).get("/projects/p1/integrations/jira");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ connected: false, provider: "jira", scopes: [] });
    expect(integrationsService.getIntegrationStatus).toHaveBeenCalledWith("p1", "jira");
  });

  test("disconnectIntegration returns message", async () => {
    (integrationsService.disconnectIntegration as jest.Mock).mockResolvedValue({ message: "ok" });

    const res = await request(app).delete("/projects/p1/integrations/jira");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "ok" });
    expect(integrationsService.disconnectIntegration).toHaveBeenCalledWith("p1", "jira");
  });

  test("oauthCallback redirects to service success URL", async () => {
    (integrationsService.completeOAuth as jest.Mock).mockResolvedValue("https://app.example.com/projects/p1/integrations?status=connected");

    const res = await request(app).get("/oauth/jira/callback").query({ code: "c", state: "s" });

    expect(res.status).toBe(302);
    expect(res.header.location).toBe("https://app.example.com/projects/p1/integrations?status=connected");
    expect(integrationsService.completeOAuth).toHaveBeenCalledWith("jira", "c", "s");
  });

  test("oauthCallback redirects error when code or state missing", async () => {
    const res = await request(app).get("/oauth/jira/callback");
    const redirect = new URL(res.header.location);

    expect(res.status).toBe(302);
    expect(redirect.searchParams.get("provider")).toBe("jira");
    expect(redirect.searchParams.get("error")).toBe(INTEGRATIONS_MESSAGES.OAUTH_CODE_MISSING);
  });

  test("oauthCallback redirects cancelled error when provider denies access", async () => {
    const res = await request(app).get("/oauth/jira/callback").query({ error: "access_denied" });
    const redirect = new URL(res.header.location);

    expect(res.status).toBe(302);
    expect(redirect.searchParams.get("error")).toBe(INTEGRATIONS_MESSAGES.OAUTH_CANCELLED);
  });

  test("oauthCallback redirects service errors to frontend", async () => {
    (integrationsService.completeOAuth as jest.Mock).mockRejectedValue(new Error("exchange failed"));

    const res = await request(app).get("/oauth/jira/callback").query({ code: "c", state: "s" });
    const redirect = new URL(res.header.location);

    expect(res.status).toBe(302);
    expect(redirect.searchParams.get("error")).toBe("exchange failed");
  });
});
