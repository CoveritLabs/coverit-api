// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@services/logger.service", () => ({ logger: { warn: jest.fn() } }));

import prisma from "@lib/prisma";
import * as svc from "@services/projectActivity.service";

const mockPrisma = prisma as any;

describe("projectActivity.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.user = { findUnique: jest.fn() };
    mockPrisma.projectActivity = { createMany: jest.fn() };
  });

  test("enriches activities with actor snapshot", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user1", name: "Ada Lovelace", email: "ada@example.test" });

    await svc.recordProjectActivities([
      {
        projectId: "project1",
        eventType: "project.updated",
        entityType: "project",
        entityId: "project1",
        message: "Updated project details",
        metadata: { name: "Checkout" },
      },
    ], "user1");

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user1" },
      select: { id: true, name: true, email: true },
    });
    expect(mockPrisma.projectActivity.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          projectId: "project1",
          actorUserId: "user1",
          actorName: "Ada Lovelace",
          actorEmail: "ada@example.test",
          eventType: "project.updated",
        }),
      ],
    });
  });
});
