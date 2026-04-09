// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@services/targetApplication.service", () => ({
  createTargetApplication: jest.fn(),
  updateTargetApplication: jest.fn(),
  deleteTargetApplication: jest.fn(),
  getTargetApplications: jest.fn(),
  getTargetApplication: jest.fn(),
  createTargetApplicationVersion: jest.fn(),
  deleteTargetApplicationVersion: jest.fn(),
}));

import * as controller from "@api/controllers/targetApplication.controller";
import * as svc from "@services/targetApplication.service";

function makeRes() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { status, json } as any;
}

describe("targetApplication.controller", () => {
  beforeEach(() => jest.resetAllMocks());

  test("createTargetApplication - success", async () => {
    (svc.createTargetApplication as jest.Mock).mockResolvedValue({ id: "a1" });

    const req: any = { params: { projectId: "p1" }, body: { name: "app" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.createTargetApplication(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.status().json).toHaveBeenCalledWith({ id: "a1" });
  });

  test("updateTargetApplication - success", async () => {
    (svc.updateTargetApplication as jest.Mock).mockResolvedValue({ message: "ok" });

    const req: any = { params: { projectId: "p1", appId: "a1" }, body: {} };
    const res = makeRes();
    const next = jest.fn();

    await controller.updateTargetApplication(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("deleteTargetApplication - success", async () => {
    (svc.deleteTargetApplication as jest.Mock).mockResolvedValue({ message: "ok" });

    const req: any = { params: { projectId: "p1", appId: "a1" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.deleteTargetApplication(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("getTargetApplications - success", async () => {
    (svc.getTargetApplications as jest.Mock).mockResolvedValue([]);

    const req: any = { params: { projectId: "p1" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.getTargetApplications(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("getTargetApplication - success", async () => {
    (svc.getTargetApplication as jest.Mock).mockResolvedValue({ id: "a1" });

    const req: any = { params: { projectId: "p1", appId: "a1" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.getTargetApplication(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("createVersion/deleteVersion - success", async () => {
    (svc.createTargetApplicationVersion as jest.Mock).mockResolvedValue({ id: "v1" });
    (svc.deleteTargetApplicationVersion as jest.Mock).mockResolvedValue({ message: "ok" });

    const reqCreate: any = { params: { projectId: "p1", appId: "a1" }, body: { version: "1.0" } };
    const resCreate = makeRes();
    const next = jest.fn();
    await controller.createVersion(reqCreate, resCreate, next);
    expect(resCreate.status).toHaveBeenCalledWith(201);

    const reqDelete: any = { params: { projectId: "p1", appId: "a1", versionId: "v1" } };
    const resDelete = makeRes();
    await controller.deleteVersion(reqDelete, resDelete, next);
    expect(resDelete.status).toHaveBeenCalledWith(200);
  });

  test("controller errors call next", async () => {
    const err = new Error("boom");
    (svc.createTargetApplication as jest.Mock).mockRejectedValue(err);

    const req: any = { params: { projectId: "p1" }, body: {} };
    const res = makeRes();
    const next = jest.fn();

    await controller.createTargetApplication(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
