// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

jest.mock("@config/env", () => ({
  env: {
    RESEND_API_KEY: "test-key",
    RESET_PASSWORD_EMAIL: "support@x.com",
    RESET_PASSWORD_TEMPLATE_ID: "template-1",
    NOTIFICATION_EMAIL: "notifications@x.com",
    ISSUE_CREATED_TEMPLATE_ID: "issue-created-template",
    ISSUE_FAILED_TEMPLATE_ID: "issue-failed-template",
    CODE_GENERATED_TEMPLATE_ID: "code-generated-template",
    CODE_GENERATION_FAILED_TEMPLATE_ID: "code-generation-failed-template",
    RESET_TOKEN_TTL_SECONDS: 900,
  }
}));

import {
  sendFrameworkGeneratedEmail,
  sendFrameworkGenerationFailedEmail,
  sendIssueCreatedEmail,
  sendIssueFailedEmail,
  sendResetEmail,
} from "@services/email.service";
import { logger } from "@services/logger.service";

jest.spyOn(logger, "info").mockImplementation();
jest.spyOn(logger, "error").mockImplementation();

describe("services/email.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("logs error if Resend fails", async () => {
    mockSend.mockResolvedValueOnce({ error: { message: "API failure" } });
    await sendResetEmail("test@x.com", "http://reset", "Tester");
    expect(logger.error).toHaveBeenCalled();
  });

  test("logs success if Resend succeeds", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "msg-123" }, error: null });
    await sendResetEmail("test@x.com", "http://reset", "Tester");
    expect(logger.info).toHaveBeenCalledTimes(2); // info and structural info
  });

  test("sends issue created template", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "msg-issue" }, error: null });

    await sendIssueCreatedEmail("test@x.com", {
      provider: "jira",
      key: "COV-1",
      title: "Bug",
      url: "https://site/browse/COV-1",
      status: "created",
      reportId: "report-1",
    });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      from: "notifications@x.com",
      to: ["test@x.com"],
      template: expect.objectContaining({
        id: "issue-created-template",
        variables: expect.objectContaining({ ISSUE_KEY: "COV-1", REPORT_ID: "report-1" }),
      }),
    }));
  });

  test("sends issue failed template", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "msg-fail" }, error: null });

    await sendIssueFailedEmail("test@x.com", {
      provider: "jira",
      title: "Bug",
      errorMessage: "bad token",
      reportId: "report-1",
    });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      template: expect.objectContaining({
        id: "issue-failed-template",
        variables: expect.objectContaining({ ERROR_MESSAGE: "bad token" }),
      }),
    }));
  });

  test("sends framework generation templates", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg-code" }, error: null });

    await sendFrameworkGeneratedEmail("test@x.com", {
      name: "Tester",
      sessionId: "session-1",
      applicationName: "Shop",
      frameworkName: "Playwright",
      repositoryUrl: "https://github.com/acme/shop",
      branchName: "codegen/1",
      changedFiles: ["tests/regression.spec.ts"],
      noChanges: false,
      pushed: true,
      pullRequestUrl: "https://github.com/acme/shop/pull/1",
    });
    await sendFrameworkGenerationFailedEmail("test@x.com", {
      name: "Tester",
      sessionId: "session-1",
      applicationName: "Shop",
      errorMessage: "push failed",
    });

    expect(mockSend).toHaveBeenNthCalledWith(1, expect.objectContaining({
      template: expect.objectContaining({ id: "code-generated-template" }),
    }));
    expect(mockSend).toHaveBeenNthCalledWith(2, expect.objectContaining({
      template: expect.objectContaining({ id: "code-generation-failed-template" }),
    }));
  });
});
