// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@queues/crawl.queue", () => ({ addCrawlJob: jest.fn(), removeCrawlJob: jest.fn() }));

import prisma from "@lib/prisma";
import { CrawlTriggerType } from "@models/crawlSession";
import * as svc from "@services/crawlSession.service";

const mockPrisma = prisma as any;
const now = new Date("2026-06-21T10:00:00.000Z");

describe("crawlSession.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1", baseUrl: "https://app.test" });
    mockPrisma.targetApplicationVersion.findFirst.mockResolvedValue({ id: "v1", targetApplicationId: "app1" });
    mockPrisma.regressionCodebase.findUnique = jest.fn().mockResolvedValue({ id: "cb1", targetApplicationId: "app1" });
    mockPrisma.crawlSession.create.mockResolvedValue({
      id: "s1",
      appVersionId: "v1",
      status: "NEW",
      triggerType: "ON_DEMAND",
      config: {},
      codegenConfig: null,
      regressionCodebaseId: "cb1",
      baseUrlSnapshot: "https://app.test",
      scheduleId: null,
      stateCount: 0,
      transitionCount: 0,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      error: null,
    });
  });

  test("persists creator user id when creating a crawl session", async () => {
    await svc.createSession("p1", "app1", "v1", "creator-1", {
      triggerType: CrawlTriggerType.ON_DEMAND,
      regressionCodebaseId: "cb1",
      crawlConfig: {
        maxStates: 10,
        maxDepth: 3,
        includeUrlPatterns: [],
        excludeUrlPatterns: [],
        enableSemanticDecisions: false,
        timeoutSeconds: 60,
      },
    });

    expect(mockPrisma.crawlSession.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        creatorUserId: "creator-1",
      }),
    }));
  });
});
