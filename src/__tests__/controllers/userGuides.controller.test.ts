// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@services/userGuides.service", () => ({
  getUserGuideStates: jest.fn(),
  generateUserGuide: jest.fn(),
}));

import * as controller from "@api/controllers/userGuides.controller";
import * as svc from "@services/userGuides.service";

const projectId = "11111111-1111-4111-8111-111111111111";
const appId = "22222222-2222-4222-8222-222222222222";
const versionId = "33333333-3333-4333-8333-333333333333";
const crawlSessionId = "44444444-4444-4444-8444-444444444444";
const startStateHash = "a".repeat(64);
const endStateHash = "b".repeat(64);

function makeReq(body: Record<string, unknown> = {}) {
  return {
    params: { projectId, appId, versionId, crawlSessionId },
    body,
  } as any;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { status, json } as any;
}

describe("userGuides.controller", () => {
  beforeEach(() => jest.resetAllMocks());

  test("getUserGuideStates returns crawl-session states", async () => {
    (svc.getUserGuideStates as jest.Mock).mockResolvedValue({ states: [] });

    const res = makeRes();
    const next = jest.fn();
    await controller.getUserGuideStates(makeReq(), res, next);

    expect(svc.getUserGuideStates).toHaveBeenCalledWith(projectId, appId, versionId, crawlSessionId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.status().json).toHaveBeenCalledWith({ states: [] });
  });

  test("generateUserGuides returns generated guide with 200", async () => {
    const response = { message: "User guide generation completed", userGuide: "Guide" };
    (svc.generateUserGuide as jest.Mock).mockResolvedValue(response);

    const res = makeRes();
    const next = jest.fn();
    await controller.generateUserGuides(makeReq({ startStateHash, endStateHash }), res, next);

    expect(svc.generateUserGuide).toHaveBeenCalledWith(projectId, appId, versionId, crawlSessionId, {
      startStateHash,
      endStateHash,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.status().json).toHaveBeenCalledWith(response);
  });

  test("controller errors call next", async () => {
    const err = new Error("boom");
    (svc.getUserGuideStates as jest.Mock).mockRejectedValue(err);

    const res = makeRes();
    const next = jest.fn();
    await controller.getUserGuideStates(makeReq(), res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
