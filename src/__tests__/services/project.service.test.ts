// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Unit tests for project.service covering main branches
jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@lib/cache", () => ({
  cacheDelByPattern: jest.fn(),
  cacheGetJSON: jest.fn(),
  cacheSetJSON: jest.fn(),
  cacheKeys: {
    user: { projects: (id: string) => `user:projects:${id}`, projectsPattern: () => "user:projects:*" },
    project: { byId: (id: string) => `project:${id}`, byIdPattern: (id: string) => `project:${id}*` },
  },
}));
jest.mock("@services/user.service", () => ({ getUsersByEmails: jest.fn() }));

import prisma from "@lib/prisma";
import * as cache from "@lib/cache";
import * as userService from "@services/user.service";
import * as svc from "@services/project.service";
import { PROJECT_MESSAGES } from "@constants/messages/project";
import { ProjectRole } from "@models/project";
import { BadRequestError, NotFoundError, ConflictError } from "@utils/errors";

const mockPrisma = prisma as any;
const mockCache = cache as any;
const mockUserService = userService as any;

describe("project.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockPrisma.project = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    };

    mockPrisma.projectMember = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    };
  });

  test("getMemberRole - project missing throws NotFound", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(svc.getMemberRole("p1", "u1")).rejects.toThrow(NotFoundError);
  });

  test("getMemberRole - no membership returns null", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockPrisma.projectMember.findUnique.mockResolvedValue(null);

    const role = await svc.getMemberRole("p1", "u1");
    expect(role).toBeNull();
  });

  test("getMemberRole - returns role when present", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockPrisma.projectMember.findUnique.mockResolvedValue({ role: ProjectRole.ADMIN });

    const role = await svc.getMemberRole("p1", "u1");
    expect(role).toBe(ProjectRole.ADMIN);
  });

  test("createProject - conflict when exists", async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ id: "exists" });
    await expect(svc.createProject("u1", { name: "x" } as any)).rejects.toThrow(ConflictError);
  });

  test("createProject - success and invalidates user projects cache", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    mockPrisma.project.create.mockResolvedValue({ id: "new-id" });

    const res = await svc.createProject("u1", { name: "x", description: "d" } as any);
    expect(res).toEqual({ id: "new-id" });
    expect(mockCache.cacheDelByPattern).toHaveBeenCalledWith("user:projects:*", expect.any(String));
  });

  test("updateProject - not found throws", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(svc.updateProject("p1", { name: "n" } as any)).rejects.toThrow(NotFoundError);
  });

  test("updateProject - uses existing description if not provided and updates", async () => {
    const project = { id: "p1", name: "old", description: "olddesc" };
    mockPrisma.project.findUnique.mockResolvedValue(project);
    mockPrisma.project.findFirst.mockResolvedValue(null);
    mockPrisma.project.update.mockResolvedValue({});

    await svc.updateProject("p1", { name: "new" } as any);

    expect(mockPrisma.project.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { name: "new", description: "olddesc" } });
    expect(mockCache.cacheDelByPattern).toHaveBeenCalled();
  });

  test("updateProject - name conflict with other project throws", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1", name: "old" });
    mockPrisma.project.findFirst.mockResolvedValue({ id: "other" });

    await expect(svc.updateProject("p1", { name: "new" } as any)).rejects.toThrow(ConflictError);
  });

  test("deleteProject - not found throws", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(svc.deleteProject("p1")).rejects.toThrow(NotFoundError);
  });

  test("deleteProject - success invalidates caches", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockPrisma.project.delete.mockResolvedValue({});

    const res = await svc.deleteProject("p1");
    expect(res).toEqual({ message: PROJECT_MESSAGES.DELETE_SUCCESS });
    expect(mockCache.cacheDelByPattern).toHaveBeenCalled();
  });

  test("getProjects - returns cached when present", async () => {
    mockCache.cacheGetJSON.mockResolvedValue([{ id: "p1", name: "n", description: "", members: [] }]);
    const res = await svc.getProjects("u1");
    expect(res).toEqual([{ id: "p1", name: "n", description: "", members: [] }]);
    expect(mockPrisma.project.findMany).not.toHaveBeenCalled();
  });

  test("getProjects - fetches and caches when cache miss", async () => {
    mockCache.cacheGetJSON.mockResolvedValue(null);
    mockPrisma.project.findMany.mockResolvedValue([{ id: "p1", name: "n", description: null, members: [] }]);

    const res = await svc.getProjects("u1");
    expect(res[0].id).toBe("p1");
    expect(mockCache.cacheSetJSON).toHaveBeenCalledWith("user:projects:u1", expect.any(Array), undefined, expect.any(String));
  });

  test("getProject - cached returns", async () => {
    mockCache.cacheGetJSON.mockResolvedValue({ id: "p1", name: "n", description: "", members: [] });
    const res = await svc.getProject("p1");
    expect(res.id).toBe("p1");
    expect(mockPrisma.project.findUnique).not.toHaveBeenCalled();
  });

  test("getProject - not found throws", async () => {
    mockCache.cacheGetJSON.mockResolvedValue(null);
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(svc.getProject("p1")).rejects.toThrow(NotFoundError);
  });

  test("getProject - success and caches result", async () => {
    mockCache.cacheGetJSON.mockResolvedValue(null);
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1", name: "n", description: null, members: [] });

    const res = await svc.getProject("p1");
    expect(res.id).toBe("p1");
    expect(mockCache.cacheSetJSON).toHaveBeenCalledWith("project:p1", expect.any(Object), undefined, expect.any(String));
  });

  test("addMembers - project not found throws", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(svc.addMembers("p1", { members: [{ email: "a@b.com" }] } as any)).rejects.toThrow(NotFoundError);
  });

  test("addMembers - missing emails cause BadRequest", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockUserService.getUsersByEmails.mockResolvedValue([]);

    await expect(svc.addMembers("p1", { members: [{ email: "a@b.com" }] } as any)).rejects.toThrow(BadRequestError);
  });

  test("addMembers - creates new members when not existing", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockUserService.getUsersByEmails.mockResolvedValue([{ id: "u1", email: "a@b.com" }]);
    mockPrisma.projectMember.findMany.mockResolvedValue([]);
    mockPrisma.projectMember.createMany.mockResolvedValue({});

    const res = await svc.addMembers("p1", { members: [{ email: "a@b.com" }] } as any);
    expect(res).toEqual({ message: PROJECT_MESSAGES.ADD_MEMBERS_SUCCESS });
    expect(mockPrisma.projectMember.createMany).toHaveBeenCalledWith({ data: [{ projectId: "p1", userId: "u1", role: ProjectRole.VIEWER }] });
    expect(mockCache.cacheDelByPattern).toHaveBeenCalled();
  });

  test("addMembers - no new members does not call createMany", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockUserService.getUsersByEmails.mockResolvedValue([{ id: "u1", email: "a@b.com" }]);
    mockPrisma.projectMember.findMany.mockResolvedValue([{ userId: "u1" }]);

    const res = await svc.addMembers("p1", { members: [{ email: "a@b.com" }] } as any);
    expect(res).toEqual({ message: PROJECT_MESSAGES.ADD_MEMBERS_SUCCESS });
    expect(mockPrisma.projectMember.createMany).not.toHaveBeenCalled();
    expect(mockCache.cacheDelByPattern).toHaveBeenCalled();
  });

  test("updateMember - membership not found throws", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockPrisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(svc.updateMember("p1", { id: "u1", role: ProjectRole.MEMBER } as any)).rejects.toThrow(NotFoundError);
  });

  test("updateMember - success updates and invalidates cache", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockPrisma.projectMember.findUnique.mockResolvedValue({ userId: "u1" });
    mockPrisma.projectMember.update.mockResolvedValue({});

    const res = await svc.updateMember("p1", { id: "u1", role: ProjectRole.MEMBER } as any);
    expect(res).toEqual({ message: PROJECT_MESSAGES.UPDATE_MEMBER_SUCCESS });
    expect(mockPrisma.projectMember.update).toHaveBeenCalled();
    expect(mockCache.cacheDelByPattern).toHaveBeenCalled();
  });

  test("removeMembers - project missing throws", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(svc.removeMembers("p1", { emails: ["a@b.com"] } as any)).rejects.toThrow(NotFoundError);
  });

  test("removeMembers - missing emails cause BadRequest", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockUserService.getUsersByEmails.mockResolvedValue([]);

    await expect(svc.removeMembers("p1", { emails: ["a@b.com"] } as any)).rejects.toThrow(BadRequestError);
  });

  test("removeMembers - success deletes and invalidates cache", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockUserService.getUsersByEmails.mockResolvedValue([{ id: "u1", email: "a@b.com" }]);
    mockPrisma.projectMember.deleteMany.mockResolvedValue({});

    const res = await svc.removeMembers("p1", { emails: ["a@b.com"] } as any);
    expect(res).toEqual({ message: PROJECT_MESSAGES.REMOVE_MEMBERS_SUCCESS });
    expect(mockPrisma.projectMember.deleteMany).toHaveBeenCalledWith({ where: { projectId: "p1", userId: { in: ["u1"] } } });
    expect(mockCache.cacheDelByPattern).toHaveBeenCalled();
  });
});
