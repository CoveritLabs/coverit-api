// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Unit tests for targetApplication.service
jest.mock("@lib/prisma", () => require("../mocks/prisma"));

import prisma from "@lib/prisma";
import * as svc from "@services/targetApplication.service";
import { TARGET_APPLICATION_MESSAGES } from "@constants/messages/targetApplication";
import { ConflictError, NotFoundError } from "@utils/errors";

describe("targetApplication.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // ensure mocked methods exist
    (prisma as any).targetApplication = {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    (prisma as any).targetApplicationVersion = {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    };
  });

  test("createTargetApplication - conflict when existing", async () => {
    (prisma as any).targetApplication.findFirst.mockResolvedValue({ id: "exists" });

    await expect(svc.createTargetApplication("p1", { name: "app", baseUrl: "http://" } as any)).rejects.toThrow(ConflictError);
  });

  test("createTargetApplication - success returns id", async () => {
    (prisma as any).targetApplication.findFirst.mockResolvedValue(null);
    (prisma as any).targetApplication.create.mockResolvedValue({ id: "new-id" });

    const res = await svc.createTargetApplication("p1", { name: "app", baseUrl: "http://" } as any);
    expect(res).toEqual({ id: "new-id" });
  });

  test("updateTargetApplication - not found", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue(null);

    await expect(svc.updateTargetApplication("p1", "app1", { name: "x" } as any)).rejects.toThrow(NotFoundError);
  });

  test("updateTargetApplication - conflict when name taken", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", name: "old", projectId: "p1", baseUrl: "b" });
    (prisma as any).targetApplication.findFirst.mockResolvedValue({ id: "other" });

    await expect(svc.updateTargetApplication("p1", "app1", { name: "new" } as any)).rejects.toThrow(ConflictError);
  });

  test("updateTargetApplication - success", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", name: "old", projectId: "p1", baseUrl: "b" });
    (prisma as any).targetApplication.findFirst.mockResolvedValue(null);
    (prisma as any).targetApplication.update.mockResolvedValue({});

    const res = await svc.updateTargetApplication("p1", "app1", { name: "new", baseUrl: "b2" } as any);
    expect(res).toEqual({ message: TARGET_APPLICATION_MESSAGES.UPDATE_SUCCESS });
  });

  test("deleteTargetApplication - not found", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue(null);

    await expect(svc.deleteTargetApplication("p1", "app1")).rejects.toThrow(NotFoundError);
  });

  test("deleteTargetApplication - success", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    (prisma as any).targetApplication.delete.mockResolvedValue({});

    const res = await svc.deleteTargetApplication("p1", "app1");
    expect(res).toEqual({ message: TARGET_APPLICATION_MESSAGES.DELETE_SUCCESS });
  });

  test("getTargetApplications - maps result", async () => {
    (prisma as any).targetApplication.findMany.mockResolvedValue([{ id: "a1", name: "n", baseUrl: "b", versions: [{ id: "v1", version: "1.0" }] }]);

    const res = await svc.getTargetApplications("p1");
    expect(res).toEqual([{ id: "a1", name: "n", baseUrl: "b", versions: [{ id: "v1", version: "1.0" }] }]);
  });

  test("getTargetApplication - not found", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue(null);

    await expect(svc.getTargetApplication("p1", "a1")).rejects.toThrow(NotFoundError);
  });

  test("getTargetApplication - success", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({
      id: "a1",
      name: "n",
      baseUrl: "b",
      projectId: "p1",
      versions: [{ id: "v1", version: "1.0" }],
    });

    const res = await svc.getTargetApplication("p1", "a1");
    expect(res).toEqual({ id: "a1", name: "n", baseUrl: "b", versions: [{ id: "v1", version: "1.0" }] });
  });

  test("createTargetApplicationVersion - not found app", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue(null);

    await expect(svc.createTargetApplicationVersion("p1", "a1", { version: "1.0" } as any)).rejects.toThrow(NotFoundError);
  });

  test("createTargetApplicationVersion - conflict when exists", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "a1", projectId: "p1" });
    (prisma as any).targetApplicationVersion.findFirst.mockResolvedValue({ id: "v1" });

    await expect(svc.createTargetApplicationVersion("p1", "a1", { version: "1.0" } as any)).rejects.toThrow(ConflictError);
  });

  test("createTargetApplicationVersion - success", async () => {
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "a1", projectId: "p1" });
    (prisma as any).targetApplicationVersion.findFirst.mockResolvedValue(null);
    (prisma as any).targetApplicationVersion.create.mockResolvedValue({ id: "v1" });

    const res = await svc.createTargetApplicationVersion("p1", "a1", { version: "1.0" } as any);
    expect(res).toEqual({ id: "v1" });
  });

  test("deleteTargetApplicationVersion - version not found", async () => {
    (prisma as any).targetApplicationVersion.findUnique.mockResolvedValue(null);

    await expect(svc.deleteTargetApplicationVersion("p1", "a1", "v1")).rejects.toThrow(NotFoundError);
  });

  test("deleteTargetApplicationVersion - app mismatch", async () => {
    (prisma as any).targetApplicationVersion.findUnique.mockResolvedValue({ id: "v1", targetApplicationId: "a1" });
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "a1", projectId: "other" });

    await expect(svc.deleteTargetApplicationVersion("p1", "a1", "v1")).rejects.toThrow(NotFoundError);
  });

  test("deleteTargetApplicationVersion - success", async () => {
    (prisma as any).targetApplicationVersion.findUnique.mockResolvedValue({ id: "v1", targetApplicationId: "a1" });
    (prisma as any).targetApplication.findUnique.mockResolvedValue({ id: "a1", projectId: "p1" });
    (prisma as any).targetApplicationVersion.delete.mockResolvedValue({});

    const res = await svc.deleteTargetApplicationVersion("p1", "a1", "v1");
    expect(res).toEqual({ message: TARGET_APPLICATION_MESSAGES.VERSION_DELETE_SUCCESS });
  });
});
