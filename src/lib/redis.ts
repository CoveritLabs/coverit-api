// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import Redis from "ioredis";
import { env } from "@config/env";

/** Redis client configured with retry strategy. */
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
});

const workerRedis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

export default redis;
export { workerRedis };
