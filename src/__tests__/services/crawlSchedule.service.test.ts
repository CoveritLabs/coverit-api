// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));

import prisma from "@lib/prisma";
import { CrawlScheduleMode, CrawlScheduleType } from "@models/crawlSchedule";
import * as svc from "@services/crawlSchedule.service";

const mockPrisma = prisma as any;
const now = new Date("2026-06-21T10:00:00.000Z");

describe("crawlSchedule.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.targetApplication.findUnique.mockResolvedValue({ id: "app1", projectId: "p1" });
    mockPrisma.regressionCodebase.findUnique.mockResolvedValue({ id: "cb1", targetApplicationId: "app1" });
    mockPrisma.crawlSchedule.create.mockResolvedValue({
      id: "sched1",
      targetApplicationId: "app1",
      scheduleType: "ONCE",
      scheduleMode: "LATEST_VERSION",
      versionId: null,
      cronExpression: null,
      timezone: null,
      runAt: now,
      isActive: true,
      catchUp: false,
      crawlConfig: {},
      codegenConfig: null,
      regressionCodebaseId: "cb1",
      nextRunAt: now,
      lastRunAt: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  test("persists creator user id when creating a crawl schedule", async () => {
    await svc.createSchedule("p1", "app1", "creator-1", {
      scheduleType: CrawlScheduleType.ONCE,
      mode: CrawlScheduleMode.LATEST_VERSION,
      runAt: now.toISOString(),
      regressionCodebaseId: "cb1",
      crawlConfig: {
        maxStates: 10,
        timeoutSeconds: 60,
        generateTestFlows: true,
        crawlerSettings: {
          useSemanticDiversity: false,
        },
      },
    });

    expect(mockPrisma.crawlSchedule.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        creatorUserId: "creator-1",
        crawlConfig: expect.objectContaining({
          maxStates: 10,
          timeoutSeconds: 60,
          generateTestFlows: true,
          crawlerSettings: expect.objectContaining({
            use_semantic_diversity: false,
          }),
        }),
      }),
    }));
  });
});
