// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@services/crawlSession.service", () => ({
  requireApplicationVersion: jest.fn(),
  requireTargetApplication: jest.fn(),
}));
jest.mock("@lib/neo4j", () => ({
  getNeo4jReadSession: jest.fn(),
}));
jest.mock("@lib/redis", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));
jest.mock("@queues/arq/docgenArq", () => ({
  docgenArqConfig: {
    resultKeyPrefix: "arq:result:",
  },
  enqueueUserGuidesGeneration: jest.fn(),
}));

import { getNeo4jReadSession } from "@lib/neo4j";
import redis from "@lib/redis";
import { enqueueUserGuidesGeneration } from "@queues/arq/docgenArq";
import { requireApplicationVersion, requireTargetApplication } from "@services/crawlSession.service";
import * as svc from "@services/userGuides.service";
import { BadRequestError } from "@utils/errors";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

const mockRequireTargetApplication = requireTargetApplication as jest.Mock;
const mockRequireApplicationVersion = requireApplicationVersion as jest.Mock;
const mockGetNeo4jReadSession = getNeo4jReadSession as jest.Mock;
const mockRedisGet = redis.get as jest.Mock;
const mockEnqueueUserGuidesGeneration = enqueueUserGuidesGeneration as jest.Mock;

function record(values: Record<string, unknown>) {
  return {
    get: (key: string) => values[key],
  };
}

function mockNeo4jRecords(records: Array<ReturnType<typeof record>>) {
  const run = jest.fn().mockResolvedValue({ records });
  const session = {
    executeRead: jest.fn((callback: (tx: { run: typeof run }) => Promise<unknown>) => callback({ run })),
    close: jest.fn(),
  };

  mockGetNeo4jReadSession.mockReturnValue(session);
  return { run, session };
}

describe("userGuides.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRequireTargetApplication.mockResolvedValue({ id: "app-1" });
    mockRequireApplicationVersion.mockResolvedValue({ id: "version-1" });
  });

  test("lists user guide states from Neo4j after validating version scope", async () => {
    const { run, session } = mockNeo4jRecords([
      record({
        stateHash: HASH_A,
        label: "Filter Drawer",
        url: "https://shop.test/products?filter=open",
        title: "Products",
      }),
      record({
        stateHash: HASH_B,
        label: "",
        url: "https://shop.test/cart",
        title: "Cart",
      }),
    ]);

    const result = await svc.getUserGuideStates("project-1", "app-1", "version-1");

    expect(mockRequireTargetApplication).toHaveBeenCalledWith("project-1", "app-1");
    expect(mockRequireApplicationVersion).toHaveBeenCalledWith("app-1", "version-1");
    expect(run).toHaveBeenCalledWith(expect.stringContaining("MATCH (s:State {graph_id: $versionId})"), {
      versionId: "version-1",
    });
    expect(session.close).toHaveBeenCalled();
    expect(result.states).toEqual([
      {
        stateHash: HASH_A,
        label: "Filter Drawer",
        url: "https://shop.test/products?filter=open",
        path: "/products?filter=open",
        title: "Products",
      },
      {
        stateHash: HASH_B,
        label: "Cart",
        url: "https://shop.test/cart",
        path: "/cart",
        title: "Cart",
      },
    ]);
  });

  test("rejects generation when either state hash is outside the selected version graph", async () => {
    mockNeo4jRecords([record({ stateHash: HASH_A, label: "Home" })]);

    await expect(
      svc.generateUserGuide("project-1", "app-1", "version-1", {
        startStateHash: HASH_A,
        endStateHash: HASH_B,
      }),
    ).rejects.toThrow(BadRequestError);
    expect(mockEnqueueUserGuidesGeneration).not.toHaveBeenCalled();
  });

  test("queues docgen generation and returns the completed guide", async () => {
    mockNeo4jRecords([
      record({ stateHash: HASH_A, label: "Home" }),
      record({ stateHash: HASH_C, label: "Checkout" }),
    ]);
    mockEnqueueUserGuidesGeneration.mockResolvedValue("job-1");
    mockRedisGet.mockResolvedValue(JSON.stringify({ status: "completed", userGuide: "Line one\nLine two" }));

    const result = await svc.generateUserGuide("project-1", "app-1", "version-1", {
      startStateHash: HASH_A,
      endStateHash: HASH_C,
    });

    expect(mockEnqueueUserGuidesGeneration).toHaveBeenCalledWith({
      graph_id: "version-1",
      start_state_hash: HASH_A,
      end_state_hash: HASH_C,
    });
    expect(mockRedisGet).toHaveBeenCalledWith("arq:result:job-1");
    expect(result).toEqual({
      message: "User guide generation completed",
      userGuide: "Line one\nLine two",
      error: undefined,
    });
  });
});
