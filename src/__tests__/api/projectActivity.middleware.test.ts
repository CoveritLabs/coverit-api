// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@services/projectActivity.service", () => ({
  recordProjectActivities: jest.fn(),
}));

import express from "express";
import request from "supertest";
import { projectActivityRecorder } from "@api/middlewares/projectActivity";
import { recordProjectActivities } from "@services/projectActivity.service";

const mockRecordProjectActivities = recordProjectActivities as jest.MockedFunction<typeof recordProjectActivities>;

function buildApp(statusCode: number) {
  const app = express();
  app.use((req, _res, next) => {
    req.userId = "user1";
    next();
  });
  app.use(projectActivityRecorder);
  app.post("/activity", (req, res) => {
    req.recordProjectActivity?.({
      projectId: "project1",
      eventType: "project.updated",
      entityType: "project",
      entityId: "project1",
      message: "Updated project details",
    });
    res.status(statusCode).json({ ok: statusCode < 400 });
  });
  return app;
}

describe("projectActivityRecorder", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRecordProjectActivities.mockResolvedValue(undefined);
  });

  test("persists queued activities for successful responses", async () => {
    await request(buildApp(200)).post("/activity").expect(200);

    expect(mockRecordProjectActivities).toHaveBeenCalledWith([
      expect.objectContaining({ projectId: "project1", eventType: "project.updated" }),
    ], "user1");
  });

  test("does not persist queued activities for failed responses", async () => {
    await request(buildApp(500)).post("/activity").expect(500);

    expect(mockRecordProjectActivities).not.toHaveBeenCalled();
  });
});
