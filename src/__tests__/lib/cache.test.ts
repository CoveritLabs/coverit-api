// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import redis from "@lib/redis";
import { cacheDelByPattern, cacheScan } from "@lib/cache";

describe("lib/cache", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
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

  test("cacheDelByPattern deletes matched keys", async () => {
    jest.spyOn(redis, "scan").mockResolvedValueOnce(["0", ["keyA", "keyB"]]);
    jest.spyOn(redis, "del").mockResolvedValue(2);

    await cacheDelByPattern("pattern:*");

    expect(redis.del).toHaveBeenCalledWith("keyA", "keyB");
  });
});
