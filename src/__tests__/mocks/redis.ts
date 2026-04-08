// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

const redis = {
  set: jest.fn().mockResolvedValue("OK"),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  scan: jest.fn().mockResolvedValue(["0", []]),
  ping: jest.fn().mockResolvedValue("PONG"),
  on: jest.fn(),
  disconnect: jest.fn(),
};

export default redis;
