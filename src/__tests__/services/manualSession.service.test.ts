// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("crypto", () => ({
  randomUUID: jest.fn(),
}));
jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@lib/redis", () => require("../mocks/redis"));
jest.mock("@queues/crawl.queue", () => ({
  addManualSessionJob: jest.fn(),
}));

import { randomUUID } from "crypto";

import prisma from "@lib/prisma";
import redis from "@lib/redis";
import { cacheKeys } from "@lib/cache";
import { addManualSessionJob } from "@queues/crawl.queue";
import * as svc from "@services/manualSession.service";

const mockPrisma = prisma as any;
const mockRedis = redis as any;
const mockRandomUUID = randomUUID as jest.Mock;
const mockAddManualSessionJob = addManualSessionJob as jest.Mock;

describe("manualSession.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockRandomUUID.mockReturnValue("ticket-1");
    mockPrisma.targetApplication.findUnique.mockResolvedValue({
      id: "app1",
      projectId: "project1",
      baseUrl: "https://app.test",
    });
    mockPrisma.targetApplicationVersion.findFirst.mockResolvedValue({
      id: "version1",
      targetApplicationId: "app1",
    });
    mockPrisma.crawlSession.create.mockResolvedValue({
      id: "session1",
    });
    mockPrisma.crawlSession.findFirst.mockResolvedValue({
      id: "session1",
      status: "RUNNING",
      triggerType: "MANUAL",
    });
    mockPrisma.crawlSession.update.mockResolvedValue({});
    mockRedis.set.mockResolvedValue("OK");
    mockRedis.get.mockResolvedValue(null);
    mockRedis.del.mockResolvedValue(1);
    mockAddManualSessionJob.mockResolvedValue("session1");
  });

  test("creates a manual recording session, queues it, and issues a ticket", async () => {
    const result = await svc.createManualSession("project1", "app1", "version1", "user1");

    expect(result).toEqual({ sessionId: "session1", wsTicket: "ticket-1" });
    expect(mockPrisma.crawlSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appVersionId: "version1",
        creatorUserId: "user1",
        status: "QUEUED",
        triggerType: "MANUAL",
        baseUrlSnapshot: "https://app.test",
      }),
    });
    expect(mockAddManualSessionJob).toHaveBeenCalledWith("session1");
    expect(mockRedis.set).toHaveBeenCalledWith(
      cacheKeys.manualSession.ticket("ticket-1"),
      JSON.stringify({ sessionId: "session1", userId: "user1" }),
      "EX",
      expect.any(Number),
    );
  });

  test("consumes a valid ticket once", async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ sessionId: "session1", userId: "user1" }));

    await expect(svc.consumeManualSessionTicket("session1", "ticket-1")).resolves.toEqual({
      sessionId: "session1",
      userId: "user1",
    });

    expect(mockRedis.get).toHaveBeenCalledWith(cacheKeys.manualSession.ticket("ticket-1"));
    expect(mockRedis.del).toHaveBeenCalledWith(cacheKeys.manualSession.ticket("ticket-1"));
  });

  test("rejects an invalid or expired ticket", async () => {
    mockRedis.get.mockResolvedValue(null);

    await expect(svc.consumeManualSessionTicket("session1", "ticket-1")).rejects.toThrow("Manual session ticket is invalid or expired");
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  test("rejects a ticket for another session after deleting it", async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ sessionId: "other-session", userId: "user1" }));

    await expect(svc.consumeManualSessionTicket("session1", "ticket-1")).rejects.toThrow("Manual session ticket does not match the session ID");
    expect(mockRedis.del).toHaveBeenCalledWith(cacheKeys.manualSession.ticket("ticket-1"));
  });

  test("requires the target application base URL", async () => {
    mockPrisma.targetApplication.findUnique.mockResolvedValue({
      id: "app1",
      projectId: "project1",
      baseUrl: null,
    });

    await expect(svc.createManualSession("project1", "app1", "version1", "user1")).rejects.toThrow("Base URL is required");
    expect(mockPrisma.crawlSession.create).not.toHaveBeenCalled();
    expect(mockAddManualSessionJob).not.toHaveBeenCalled();
  });

  test("marks the session failed when queueing the manual recording job fails", async () => {
    mockAddManualSessionJob.mockRejectedValue(new Error("queue down"));

    await expect(svc.createManualSession("project1", "app1", "version1", "user1")).rejects.toThrow("queue down");
    expect(mockPrisma.crawlSession.update).toHaveBeenCalledWith({
      where: { id: "session1" },
      data: expect.objectContaining({
        status: "FAILED",
        finishedAt: expect.any(Date),
        error: "queue down",
      }),
    });
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  test("reattaches an active manual recording by issuing a fresh ticket", async () => {
    const result = await svc.reattachManualSession("project1", "app1", "version1", "session1", "user1");

    expect(result).toEqual({ sessionId: "session1", wsTicket: "ticket-1" });
    expect(mockPrisma.crawlSession.findFirst).toHaveBeenCalledWith({
      where: {
        id: "session1",
        appVersionId: "version1",
      },
      select: {
        id: true,
        status: true,
        triggerType: true,
      },
    });
    expect(mockAddManualSessionJob).not.toHaveBeenCalled();
    expect(mockPrisma.crawlSession.create).not.toHaveBeenCalled();
    expect(mockRedis.set).toHaveBeenCalledWith(
      cacheKeys.manualSession.ticket("ticket-1"),
      JSON.stringify({ sessionId: "session1", userId: "user1" }),
      "EX",
      expect.any(Number),
    );
  });

  test("rejects reattach for terminal manual recordings", async () => {
    mockPrisma.crawlSession.findFirst.mockResolvedValue({
      id: "session1",
      status: "COMPLETED",
      triggerType: "MANUAL",
    });

    await expect(svc.reattachManualSession("project1", "app1", "version1", "session1", "user1")).rejects.toThrow(
      "Manual session is no longer active",
    );
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  test("rejects reattach for non-manual sessions", async () => {
    mockPrisma.crawlSession.findFirst.mockResolvedValue({
      id: "session1",
      status: "RUNNING",
      triggerType: "ON_DEMAND",
    });

    await expect(svc.reattachManualSession("project1", "app1", "version1", "session1", "user1")).rejects.toThrow(
      "Session is not a manual recording",
    );
    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});
