// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@config/env", () => ({
  env: {
    MANUAL_ARQ_QUEUE_NAME: "arq:manual-test",
  },
}));
jest.mock("@lib/redis", () => require("../mocks/redis"));
jest.mock("@queues/arq", () => ({
  enqueueArqJob: jest.fn().mockResolvedValue("job-1"),
}));

import { enqueueArqJob } from "@queues/arq";
import { enqueueCrawlSession, enqueueManualRecordSession } from "@queues/arq/crawlArq";

const mockEnqueueArqJob = enqueueArqJob as jest.Mock;

describe("crawl arq queues", () => {
  beforeEach(() => {
    mockEnqueueArqJob.mockClear();
  });

  test("routes crawl sessions to the crawl queue", async () => {
    await enqueueCrawlSession("session-1");

    expect(mockEnqueueArqJob).toHaveBeenCalledWith(
      "session-1",
      "crawl_session",
      ["session-1"],
      expect.objectContaining({ queueName: "arq:queue" }),
    );
  });

  test("routes manual recording sessions to the manual queue", async () => {
    await enqueueManualRecordSession("session-1");

    expect(mockEnqueueArqJob).toHaveBeenCalledWith(
      "session-1",
      "manual_record_session",
      ["session-1"],
      expect.objectContaining({ queueName: "arq:manual-test" }),
    );
  });
});
