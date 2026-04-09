// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@services/project.service", () => ({
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  getProjects: jest.fn(),
  getProject: jest.fn(),
  addMembers: jest.fn(),
  updateMember: jest.fn(),
  removeMembers: jest.fn(),
}));

jest.mock("@api/middlewares/requireAuth", () => ({ getCurrentUserId: jest.fn() }));

import * as controller from "@api/controllers/project.controller";
import * as projectService from "@services/project.service";
import { getCurrentUserId } from "@api/middlewares/requireAuth";

function makeRes() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { status, json } as any;
}

describe("project.controller", () => {
  beforeEach(() => jest.resetAllMocks());

  test("createProject - success", async () => {
    (getCurrentUserId as jest.Mock).mockReturnValue("u1");
    (projectService.createProject as jest.Mock).mockResolvedValue({ id: "p1" });

    const req: any = { body: { name: "x" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.createProject(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.status().json).toHaveBeenCalledWith({ id: "p1" });
  });

  test("createProject - error calls next", async () => {
    (getCurrentUserId as jest.Mock).mockReturnValue("u1");
    const err = new Error("boom");
    (projectService.createProject as jest.Mock).mockRejectedValue(err);

    const req: any = { body: { name: "x" } };
    const res = makeRes();
    const next = jest.fn();

    await controller.createProject(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  test("updateProject/deleteProject/getProjects/getProject - success paths", async () => {
    (projectService.updateProject as jest.Mock).mockResolvedValue({ message: "ok" });
    (projectService.deleteProject as jest.Mock).mockResolvedValue({ message: "ok" });
    (getCurrentUserId as jest.Mock).mockReturnValue("u1");
    (projectService.getProjects as jest.Mock).mockResolvedValue([]);
    (projectService.getProject as jest.Mock).mockResolvedValue({ id: "p1" });

    const next = jest.fn();

    let req: any = { params: { projectId: "p1" }, body: {} };
    let res = makeRes();
    await controller.updateProject(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);

    req = { params: { projectId: "p1" } } as any;
    res = makeRes();
    await controller.deleteProject(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);

    req = {} as any;
    res = makeRes();
    await controller.getProjects(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);

    req = { params: { projectId: "p1" } } as any;
    res = makeRes();
    await controller.getProject(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("members endpoints - add/update/remove members success", async () => {
    (projectService.addMembers as jest.Mock).mockResolvedValue({ message: "ok" });
    (projectService.updateMember as jest.Mock).mockResolvedValue({ message: "ok" });
    (projectService.removeMembers as jest.Mock).mockResolvedValue({ message: "ok" });

    const next = jest.fn();

    let req: any = { params: { projectId: "p1" }, body: { members: [] } };
    let res = makeRes();
    await controller.addProjectMembers(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);

    req = { params: { projectId: "p1" }, body: { id: "u1", role: "ADMIN" } } as any;
    res = makeRes();
    await controller.updateProjectMember(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);

    req = { params: { projectId: "p1" }, body: { emails: ["a@b.com"] } } as any;
    res = makeRes();
    await controller.removeProjectMembers(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("controller error paths call next for other endpoints", async () => {
    const err = new Error("boom");

    // updateProject error
    (projectService.updateProject as jest.Mock).mockRejectedValueOnce(err);
    let req: any = { params: { projectId: "p1" }, body: {} };
    let res = makeRes();
    let next = jest.fn();
    await controller.updateProject(req, res, next);
    expect(next).toHaveBeenCalledWith(err);

    // deleteProject error
    (projectService.deleteProject as jest.Mock).mockRejectedValueOnce(err);
    req = { params: { projectId: "p1" } } as any;
    res = makeRes();
    next = jest.fn();
    await controller.deleteProject(req, res, next);
    expect(next).toHaveBeenCalledWith(err);

    // getProjects error (uses getCurrentUserId)
    (getCurrentUserId as jest.Mock).mockReturnValue("u1");
    (projectService.getProjects as jest.Mock).mockRejectedValueOnce(err);
    req = {} as any;
    res = makeRes();
    next = jest.fn();
    await controller.getProjects(req, res, next);
    expect(next).toHaveBeenCalledWith(err);

    // getProject error
    (projectService.getProject as jest.Mock).mockRejectedValueOnce(err);
    req = { params: { projectId: "p1" } } as any;
    res = makeRes();
    next = jest.fn();
    await controller.getProject(req, res, next);
    expect(next).toHaveBeenCalledWith(err);

    // addProjectMembers error
    (projectService.addMembers as jest.Mock).mockRejectedValueOnce(err);
    req = { params: { projectId: "p1" }, body: { members: [] } } as any;
    res = makeRes();
    next = jest.fn();
    await controller.addProjectMembers(req, res, next);
    expect(next).toHaveBeenCalledWith(err);

    // updateProjectMember error
    (projectService.updateMember as jest.Mock).mockRejectedValueOnce(err);
    req = { params: { projectId: "p1" }, body: { id: "u1", role: "ADMIN" } } as any;
    res = makeRes();
    next = jest.fn();
    await controller.updateProjectMember(req, res, next);
    expect(next).toHaveBeenCalledWith(err);

    // removeProjectMembers error
    (projectService.removeMembers as jest.Mock).mockRejectedValueOnce(err);
    req = { params: { projectId: "p1" }, body: { emails: ["a@b.com"] } } as any;
    res = makeRes();
    next = jest.fn();
    await controller.removeProjectMembers(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
