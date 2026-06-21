// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import {
  emailQueue,
  enqueueFrameworkGeneratedEmail,
  enqueueFrameworkGenerationFailedEmail,
  enqueueIssueCreatedEmail,
  enqueueIssueFailedEmail,
} from "@queues/email.queue";

jest.mock("bullmq", () => {
  const addMock = jest.fn();
  return {
    Queue: jest.fn().mockImplementation((name) => ({ name, add: addMock })),
    __addMock: addMock,
  };
});
jest.mock("@lib/redis", () => ({}));

const addMock = (jest.requireMock("bullmq") as { __addMock: jest.Mock }).__addMock;

describe("queues/email.queue", () => {
  test("exports email queue instance", () => {
    // This just validates the queue definition runs without error 
    // and matches the mocked structure
    expect(emailQueue).toBeDefined();
    expect(emailQueue.name).toBe("email");
  });

  test("notification job ids are deterministic and BullMQ-safe", async () => {
    addMock.mockClear();

    await enqueueIssueCreatedEmail({
      email: "u@example.com",
      provider: "jira",
      key: "COV-1",
      title: "Bug",
      status: "created",
      reportId: "report:1",
    });
    await enqueueIssueFailedEmail({
      email: "u@example.com",
      provider: "jira",
      title: "Bug",
      errorMessage: "failed",
      reportId: "report:1",
    });
    await enqueueFrameworkGeneratedEmail({
      email: "u@example.com",
      name: "User",
      sessionId: "session:1",
      applicationName: "App",
      branchName: "codegen/1",
      changedFiles: [],
      noChanges: true,
      pushed: false,
    });
    await enqueueFrameworkGenerationFailedEmail({
      email: "u@example.com",
      name: "User",
      sessionId: "session:1",
      applicationName: "App",
      errorMessage: "failed",
    });

    const jobIds = addMock.mock.calls.map((call) => call[2].jobId);
    expect(jobIds).toEqual([
      "issue-created--report-1",
      "issue-failed--report-1",
      "framework-generated--session-1",
      "framework-generation-failed--session-1",
    ]);
    expect(jobIds.every((jobId) => !jobId.includes(":"))).toBe(true);
  });
});
