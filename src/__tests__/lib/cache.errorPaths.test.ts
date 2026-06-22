// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/redis", () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
}));

import * as cache from "@lib/cache";
import { logger } from "@services/logger.service";

describe("cache error paths", () => {
  beforeEach(() => jest.resetAllMocks());

  test("cacheGetJSON returns null and logs when redis.get throws", async () => {
    const redis = require("@lib/redis");
    (redis.get as jest.Mock).mockRejectedValue(new Error("boom"));

    const spy = jest.spyOn(logger, "warn").mockImplementation(() => undefined as any);

    const res = await cache.cacheGetJSON("k1");
    expect(res).toBeNull();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  test("cacheSetJSON logs when redis.set throws", async () => {
    const redis = require("@lib/redis");
    (redis.set as jest.Mock).mockRejectedValue(new Error("boom"));

    const spy = jest.spyOn(logger, "warn").mockImplementation(() => undefined as any);

    await cache.cacheSetJSON("k2", { a: 1 });
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  test("cacheDel is no-op on empty array", async () => {
    const redis = require("@lib/redis");
    const spy = jest.spyOn(redis, "del" as any);
    await cache.cacheDel([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("cacheDelByPattern deletes matched keys", async () => {
    const redis = require("@lib/redis");
    (redis.scan as jest.Mock).mockResolvedValueOnce(["0", ["k1", "k2"]]);
    const spy = jest.spyOn(redis, "del" as any).mockResolvedValue(2 as any);

    await cache.cacheDelByPattern("pat*");
    expect(spy).toHaveBeenCalledWith("k1", "k2");

    spy.mockRestore();
  });

  test("cacheScan handles scan failure and returns empty array", async () => {
    const redis = require("@lib/redis");
    (redis.scan as jest.Mock).mockRejectedValueOnce(new Error("boom"));
    const spy = jest.spyOn(logger, "warn").mockImplementation(() => undefined as any);

    const res = await cache.cacheScan("p*");
    expect(res).toEqual([]);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
