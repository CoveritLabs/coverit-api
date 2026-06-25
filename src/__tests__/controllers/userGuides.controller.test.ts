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
const startStateHash = "a".repeat(64);
const endStateHash = "b".repeat(64);

function makeReq(body: Record<string, unknown> = {}) {
  return {
    params: { projectId, appId, versionId },
    body,
    recordProjectActivity: jest.fn(),
  } as any;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { status, json } as any;
}

describe("userGuides.controller", () => {
  beforeEach(() => jest.resetAllMocks());

  test("getUserGuideStatesForVersion returns version states", async () => {
    (svc.getUserGuideStates as jest.Mock).mockResolvedValue({ states: [] });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();
    await controller.getUserGuideStatesForVersion(req, res, next);

    expect(svc.getUserGuideStates).toHaveBeenCalledWith(projectId, appId, versionId);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.status().json).toHaveBeenCalledWith({ states: [] });
    expect(req.recordProjectActivity).not.toHaveBeenCalled();
  });

  test("generateUserGuidesForVersion records activity after successful generation", async () => {
    const response = { message: "User guide generation completed", userGuide: "Guide" };
    (svc.generateUserGuide as jest.Mock).mockResolvedValue(response);

    const req = makeReq({ startStateHash, endStateHash });
    const res = makeRes();
    const next = jest.fn();
    await controller.generateUserGuidesForVersion(req, res, next);

    expect(svc.generateUserGuide).toHaveBeenCalledWith(projectId, appId, versionId, {
      startStateHash,
      endStateHash,
    });
    expect(req.recordProjectActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        eventType: "user_guide.generated",
        entityType: "user_guide",
        metadata: expect.objectContaining({ applicationId: appId, versionId, startStateHash, endStateHash }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.status().json).toHaveBeenCalledWith(response);
  });

  test("generateUserGuidesForVersion skips activity when generation returns an error", async () => {
    const response = { message: "User guide generation failed", userGuide: "Guide generation failed", error: "No path" };
    (svc.generateUserGuide as jest.Mock).mockResolvedValue(response);

    const req = makeReq({ startStateHash, endStateHash });
    const res = makeRes();
    const next = jest.fn();
    await controller.generateUserGuidesForVersion(req, res, next);

    expect(req.recordProjectActivity).not.toHaveBeenCalled();
    expect(res.status().json).toHaveBeenCalledWith(response);
  });

  test("controller errors call next", async () => {
    const err = new Error("boom");
    (svc.getUserGuideStates as jest.Mock).mockRejectedValue(err);

    const res = makeRes();
    const next = jest.fn();
    await controller.getUserGuideStatesForVersion(makeReq(), res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
