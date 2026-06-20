// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import express from "express";
import request from "supertest";
import regressionIngestRoutes from "@api/routes/regressionIngest.routes";
import { errorHandler } from "@api/middlewares/errorHandler";
import * as regressionRunService from "@services/regressionRun.service";

jest.mock("@services/regressionRun.service", () => ({
  uploadArtifact: jest.fn(),
  ingestEvents: jest.fn(),
  completeRun: jest.fn(),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/regression", regressionIngestRoutes);
  app.use(errorHandler);
  return app;
}

describe("regression artifact upload route", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (regressionRunService.uploadArtifact as jest.Mock).mockResolvedValue({
      message: "Regression artifact stored",
      artifact: { id: "artifact1", kind: "video", uploadStatus: "uploaded" },
    });
  });

  test("parses binary multipart video artifacts with an in-memory file buffer", async () => {
    const video = Buffer.from([0, 1, 2, 3, 255, 0, 9]);

    const res = await request(createApp())
      .post("/api/v1/regression/runs/run-1/artifacts")
      .set("X-CoverIt-Api-Key", "key")
      .field("applicationId", "app1")
      .field("scenarioKey", "Feature::Scenario")
      .field("featureName", "Feature")
      .field("scenarioName", "Scenario")
      .field("kind", "video")
      .field("name", "video.webm")
      .field("relativePath", "playwright/scenario_1/video.webm")
      .field("contentType", "video/webm")
      .field("metadata", JSON.stringify({ relativePath: "playwright/scenario_1/video.webm" }))
      .attach("file", video, { filename: "video.webm", contentType: "video/webm" });

    expect(res.status).toBe(202);
    expect(regressionRunService.uploadArtifact).toHaveBeenCalledWith(
      "key",
      "run-1",
      expect.objectContaining({
        applicationId: "app1",
        kind: "video",
        relativePath: "playwright/scenario_1/video.webm",
      }),
      expect.objectContaining({
        buffer: video,
        originalName: "video.webm",
        contentType: "video/webm",
        size: video.length,
      }),
    );
  });

  test("returns bad request when multipart artifact file is missing", async () => {
    const res = await request(createApp())
      .post("/api/v1/regression/runs/run-1/artifacts")
      .set("X-CoverIt-Api-Key", "key")
      .field("applicationId", "app1")
      .field("kind", "log")
      .field("name", "run.log")
      .field("relativePath", "run.log");

    expect(res.status).toBe(400);
    expect(regressionRunService.uploadArtifact).not.toHaveBeenCalled();
  });
});
