// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

// Unit tests for cache utilities
// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/redis", () => require("../mocks/redis"));

import redis from "@lib/redis";
import { cacheGetJSON, cacheSetJSON, cacheDel, cacheDelByPattern, cacheScan } from "@lib/cache";

const mockRedis = redis as any;

describe("cache utilities", () => {
  beforeEach(() => jest.resetAllMocks());

  afterAll(() => jest.restoreAllMocks());

  test("cacheGetJSON returns parsed object when key exists", async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ a: 1 }));
    const res = await cacheGetJSON("k1");
    expect(res).toEqual({ a: 1 });
    expect(mockRedis.get).toHaveBeenCalledWith("k1");
  });

  test("cacheGetJSON returns null when redis.get throws", async () => {
    mockRedis.get.mockRejectedValue(new Error("boom"));
    const res = await cacheGetJSON("k2");
    expect(res).toBeNull();
  });

  test("cacheSetJSON calls redis.set with EX and ttl", async () => {
    await cacheSetJSON("k3", { x: 2 }, 60);
    expect(mockRedis.set).toHaveBeenCalledWith("k3", JSON.stringify({ x: 2 }), "EX", 60);
  });

  test("cacheDel is no-op on empty array", async () => {
    await cacheDel([]);
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  test("cacheDelByPattern scans keys and deletes them", async () => {
    mockRedis.scan.mockResolvedValueOnce(["0", ["k1", "k2"]]);
    await cacheDelByPattern("pat*");
    expect(mockRedis.del).toHaveBeenCalledWith("k1", "k2");
  });

  test("cacheScan returns keys from single scan and handles errors", async () => {
    mockRedis.scan.mockResolvedValueOnce(["0", ["kA"]]);
    const res = await cacheScan("p*");
    expect(res).toEqual(["kA"]);

    mockRedis.scan.mockRejectedValueOnce(new Error("fail"));
    const res2 = await cacheScan("p*");
    expect(res2).toEqual([]);
  });

  test("cacheScan iterates cursor batches", async () => {
    jest
      .spyOn(redis, "scan")
      .mockResolvedValueOnce(["1", ["key1"]])
      .mockResolvedValueOnce(["0", ["key2"]]);

    const result = await cacheScan("pattern:*");
    expect(result).toEqual(["key1", "key2"]);
    expect(redis.scan).toHaveBeenCalledTimes(2);
  });

  test("cacheDelByPattern deletes matched keys (spy) ", async () => {
    jest.spyOn(redis, "scan").mockResolvedValueOnce(["0", ["keyA", "keyB"]]);
    jest.spyOn(redis, "del").mockResolvedValue(2);

    await cacheDelByPattern("pattern:*");

    expect(redis.del).toHaveBeenCalledWith("keyA", "keyB");
  });
});
