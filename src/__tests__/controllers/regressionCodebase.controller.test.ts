// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@services/regressionCodebase.service", () => ({
  createRegressionCodebase: jest.fn(),
  updateRegressionCodebase: jest.fn(),
  deleteRegressionCodebase: jest.fn(),
  getRegressionCodebasesByApp: jest.fn(),
  getRegressionCodebase: jest.fn(),
}));

import * as controller from "@api/controllers/regressionCodebase.controller";
import * as rcService from "@services/regressionCodebase.service";

function makeRes() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { status, json } as any;
}

describe("regressionCodebase.controller", () => {
  beforeEach(() => jest.resetAllMocks());

  test("createRegressionCodebase - success", async () => {
    (rcService.createRegressionCodebase as jest.Mock).mockResolvedValue({ id: "cb1" });

    const req: any = { params: { appId: "app1" }, body: { repositoryUrl: "u" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.createRegressionCodebase(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.status().json).toHaveBeenCalledWith({ id: "cb1" });
  });

  test("updateRegressionCodebase - success", async () => {
    (rcService.updateRegressionCodebase as jest.Mock).mockResolvedValue({ message: "ok" });

    const req: any = { params: { appId: "app1", codebaseId: "cb1" }, body: {} };
    const res = makeRes();
    const next = jest.fn();

    await controller.updateRegressionCodebase(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("deleteRegressionCodebase - success", async () => {
    (rcService.deleteRegressionCodebase as jest.Mock).mockResolvedValue({ message: "ok" });

    const req: any = { params: { appId: "app1", codebaseId: "cb1" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.deleteRegressionCodebase(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("getRegressionCodebases - success", async () => {
    (rcService.getRegressionCodebasesByApp as jest.Mock).mockResolvedValue([]);

    const req: any = { params: { appId: "app1" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.getRegressionCodebases(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("getRegressionCodebase - success", async () => {
    (rcService.getRegressionCodebase as jest.Mock).mockResolvedValue({ id: "cb1" });

    const req: any = { params: { appId: "app1", codebaseId: "cb1" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.getRegressionCodebase(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("controller error flows call next", async () => {
    const err = new Error("boom");
    (rcService.createRegressionCodebase as jest.Mock).mockRejectedValue(err);

    const req: any = { params: { appId: "app1" }, body: {} };
    const res = makeRes();
    const next = jest.fn();

    await controller.createRegressionCodebase(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
