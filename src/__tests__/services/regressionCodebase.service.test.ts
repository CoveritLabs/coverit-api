// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Unit tests for regressionCodebase.service
jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@lib/cache", () => ({
  cacheDel: jest.fn(),
  cacheGetJSON: jest.fn(),
  cacheSetJSON: jest.fn(),
  cacheKeys: { regressionCodebase: { byApp: (id: string) => `regression:app:${id}`, byId: (id: string) => `regression:id:${id}` } },
}));

import prisma from "@lib/prisma";
import * as cache from "@lib/cache";
import * as svc from "@services/regressionCodebase.service";
import { REGRESSION_CODEBASE_MESSAGES } from "@constants/messages";
import { ConflictError, NotFoundError } from "@utils/errors";

const mockPrisma = prisma as any;
const mockCache = cache as any;

describe("regressionCodebase.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockPrisma.regressionCodebase = {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    };
  });

  test("createRegressionCodebase - conflict when repo exists", async () => {
    mockPrisma.regressionCodebase.findFirst.mockResolvedValue({ id: "r1" });
    await expect(svc.createRegressionCodebase("app1", { repositoryUrl: "u", frameworkName: "f", apiKey: "k" } as any)).rejects.toThrow(ConflictError);
  });

  test("createRegressionCodebase - success returns id and invalidates cache", async () => {
    mockPrisma.regressionCodebase.findFirst.mockResolvedValue(null);
    mockPrisma.regressionCodebase.create.mockResolvedValue({ id: "cb1" });

    const res = await svc.createRegressionCodebase("app1", { repositoryUrl: "u", frameworkName: "f", apiKey: "k" } as any);
    expect(res).toEqual({ id: "cb1" });
    expect(mockCache.cacheDel).toHaveBeenCalled();
  });

  test("updateRegressionCodebase - not found throws", async () => {
    mockPrisma.regressionCodebase.findUnique.mockResolvedValue(null);
    await expect(svc.updateRegressionCodebase("app1", "cb1", { frameworkName: "f" } as any)).rejects.toThrow(NotFoundError);
  });

  test("updateRegressionCodebase - success updates and invalidates cache", async () => {
    mockPrisma.regressionCodebase.findUnique.mockResolvedValue({ id: "cb1", targetApplicationId: "app1", frameworkName: "old", repositoryUrl: "u" });
    mockPrisma.regressionCodebase.update.mockResolvedValue({});

    const res = await svc.updateRegressionCodebase("app1", "cb1", { frameworkName: "new" } as any);
    expect(res).toEqual({ message: REGRESSION_CODEBASE_MESSAGES.UPDATE_SUCCESS });
    expect(mockPrisma.regressionCodebase.update).toHaveBeenCalled();
    expect(mockCache.cacheDel).toHaveBeenCalled();
  });

  test("deleteRegressionCodebase - not found throws", async () => {
    mockPrisma.regressionCodebase.findUnique.mockResolvedValue(null);
    await expect(svc.deleteRegressionCodebase("app1", "cb1")).rejects.toThrow(NotFoundError);
  });

  test("deleteRegressionCodebase - success deletes and invalidates cache", async () => {
    mockPrisma.regressionCodebase.findUnique.mockResolvedValue({ id: "cb1", targetApplicationId: "app1" });
    mockPrisma.regressionCodebase.delete.mockResolvedValue({});

    const res = await svc.deleteRegressionCodebase("app1", "cb1");
    expect(res).toEqual({ message: REGRESSION_CODEBASE_MESSAGES.DELETE_SUCCESS });
    expect(mockPrisma.regressionCodebase.delete).toHaveBeenCalled();
    expect(mockCache.cacheDel).toHaveBeenCalled();
  });

  test("getRegressionCodebasesByApp - returns cached when present", async () => {
    mockCache.cacheGetJSON.mockResolvedValue([{ id: "cb1", frameworkName: "f", repositoryUrl: "u" }]);
    const res = await svc.getRegressionCodebasesByApp("app1");
    expect(res).toEqual([{ id: "cb1", frameworkName: "f", repositoryUrl: "u" }]);
    expect(mockPrisma.regressionCodebase.findMany).not.toHaveBeenCalled();
  });

  test("getRegressionCodebasesByApp - cache miss fetches and caches", async () => {
    mockCache.cacheGetJSON.mockResolvedValue(null);
    mockPrisma.regressionCodebase.findMany.mockResolvedValue([{ id: "cb1", frameworkName: "f", repositoryUrl: "u" }]);

    const res = await svc.getRegressionCodebasesByApp("app1");
    expect(res).toEqual([{ id: "cb1", frameworkName: "f", repositoryUrl: "u" }]);
    expect(mockCache.cacheSetJSON).toHaveBeenCalled();
  });

  test("getRegressionCodebase - cached returns", async () => {
    mockCache.cacheGetJSON.mockResolvedValue({ id: "cb1", frameworkName: "f", repositoryUrl: "u" });
    const res = await svc.getRegressionCodebase("app1", "cb1");
    expect(res).toEqual({ id: "cb1", frameworkName: "f", repositoryUrl: "u" });
  });

  test("getRegressionCodebase - not found throws", async () => {
    mockCache.cacheGetJSON.mockResolvedValue(null);
    mockPrisma.regressionCodebase.findUnique.mockResolvedValue(null);
    await expect(svc.getRegressionCodebase("app1", "cb1")).rejects.toThrow(NotFoundError);
  });

  test("getRegressionCodebase - success fetches and caches", async () => {
    mockCache.cacheGetJSON.mockResolvedValue(null);
    mockPrisma.regressionCodebase.findUnique.mockResolvedValue({ id: "cb1", frameworkName: "f", repositoryUrl: "u", targetApplicationId: "app1" });

    const res = await svc.getRegressionCodebase("app1", "cb1");
    expect(res).toEqual({ id: "cb1", frameworkName: "f", repositoryUrl: "u" });
    expect(mockCache.cacheSetJSON).toHaveBeenCalled();
  });
});
