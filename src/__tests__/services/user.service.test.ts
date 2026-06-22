// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Unit tests for user.service
jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@lib/cache", () => ({
  cacheDel: jest.fn(),
  cacheGetJSON: jest.fn(),
  cacheSetJSON: jest.fn(),
  cacheKeys: { user: { byId: (id: string) => `user:id:${id}`, byEmail: (e: string) => `user:email:${e.toLowerCase()}` } },
}));

import prisma from "@lib/prisma";
import * as cache from "@lib/cache";
import * as svc from "@services/user.service";
import { NotFoundError, BadRequestError } from "@utils/errors";
import { USER_MESSAGES } from "@constants/messages/user";

const mockPrisma = prisma as any;
const mockCache = cache as any;

describe("user.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockPrisma.user = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  test("getUser - returns cached when available", async () => {
    mockCache.cacheGetJSON.mockResolvedValue({ id: "u1", email: "a@b.com", name: "T" });
    const res = await svc.getUser("u1");
    expect(res).toEqual({ id: "u1", email: "a@b.com", name: "T" });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("getUser - not found throws", async () => {
    mockCache.cacheGetJSON.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(svc.getUser("u1")).rejects.toThrow(NotFoundError);
  });

  test("getUser - success sets caches", async () => {
    mockCache.cacheGetJSON.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", name: "T" });

    const res = await svc.getUser("u1");
    expect(res).toEqual({ id: "u1", email: "a@b.com", name: "T" });
    expect(mockCache.cacheSetJSON).toHaveBeenCalledTimes(2);
  });

  test("updateUser - not found throws", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(svc.updateUser("u1", { name: "N" })).rejects.toThrow(NotFoundError);
  });

  test("updateUser - email in use throws", async () => {
    // first call: find by id -> returns existing user
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "u1", email: "old@b.com", name: "T" });
    // second call: find by email -> returns a different user (email in use)
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "other", email: "new@b.com", name: "Other" });

    await expect(svc.updateUser("u1", { email: "new@b.com" })).rejects.toThrow(BadRequestError);
  });

  test("updateUser - success invalidates caches", async () => {
    // first call: find by id -> existing user
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "u1", email: "old@b.com", name: "T" });
    // second call: find by email -> null (email not used)
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.update.mockResolvedValue({});

    const res = await svc.updateUser("u1", { email: "new@b.com", name: "N" });
    expect(res).toEqual({ message: USER_MESSAGES.UPDATE_SUCCESS });
    expect(mockCache.cacheDel).toHaveBeenCalled();
  });

  test("deleteUser - not found throws", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(svc.deleteUser("u1")).rejects.toThrow(NotFoundError);
  });

  test("deleteUser - success deletes and invalidates cache", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com" });
    mockPrisma.user.delete.mockResolvedValue({});

    const res = await svc.deleteUser("u1");
    expect(res).toEqual({ message: USER_MESSAGES.DELETE_SUCCESS });
    expect(mockCache.cacheDel).toHaveBeenCalled();
  });

  test("getUsersByEmails - uses cache and fetches missing ones", async () => {
    mockCache.cacheGetJSON.mockImplementation(async (key: string) => {
      if (key === "user:email:cached@x.com") return { id: "u-cached", email: "cached@x.com", name: "C" };
      return null;
    });

    mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", email: "missing@x.com", name: "M" }]);

    const res = await svc.getUsersByEmails(["cached@x.com", "missing@x.com"]);
    expect(res).toEqual(
      expect.arrayContaining([
        { id: "u-cached", email: "cached@x.com", name: "C" },
        { id: "u1", email: "missing@x.com", name: "M" },
      ]),
    );
    expect(mockCache.cacheSetJSON).toHaveBeenCalled();
  });
});
