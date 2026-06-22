// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@queues/email.queue", () => ({
  enqueueFrameworkGeneratedEmail: jest.fn(),
  enqueueFrameworkGenerationFailedEmail: jest.fn(),
  enqueueIssueCreatedEmail: jest.fn(),
  enqueueIssueFailedEmail: jest.fn(),
}));

import prisma from "@lib/prisma";
import {
  enqueueFrameworkGeneratedEmail,
  enqueueFrameworkGenerationFailedEmail,
  enqueueIssueCreatedEmail,
  enqueueIssueFailedEmail,
} from "@queues/email.queue";
import * as svc from "@services/notifications.service";

const mockPrisma = prisma as any;
const mockEnqueueFrameworkGeneratedEmail = enqueueFrameworkGeneratedEmail as jest.Mock;
const mockEnqueueFrameworkGenerationFailedEmail = enqueueFrameworkGenerationFailedEmail as jest.Mock;
const mockEnqueueIssueCreatedEmail = enqueueIssueCreatedEmail as jest.Mock;
const mockEnqueueIssueFailedEmail = enqueueIssueFailedEmail as jest.Mock;

const session = {
  id: "11111111-1111-1111-1111-111111111111",
  creator: { id: "u1", email: "creator@example.com", name: "Creator" },
  regressionCodebase: {
    frameworkName: "Playwright",
    repositoryUrl: "https://github.com/acme/shop",
  },
  appVersion: {
    targetApplication: {
      name: "Shop",
    },
  },
};

const now = new Date("2026-06-21T10:00:00.000Z");

function scenarioReport(overrides: Record<string, any> = {}) {
  return {
    id: "report-1",
    projectId: "project1",
    runDbId: "run-db-1",
    scenarioId: "scenario1",
    provider: "JIRA",
    status: "PENDING",
    title: "Checkout fails",
    description: "Checkout is broken",
    reporterUserId: "user1",
    reporterEmail: "user@example.com",
    artifactIds: [],
    attachedArtifactIds: [],
    externalIssueKey: null,
    externalIssueUrl: null,
    lastError: null,
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("notifications.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.crawlSession.findUnique.mockResolvedValue(session);
  });

  test("enqueues framework generated email for session creator", async () => {
    await svc.notifyCodegenSession(session.id, {
      status: "generated",
      branchName: "codegen/1",
      changedFiles: ["tests/regression.spec.ts"],
      noChanges: false,
      pushed: true,
      pullRequestUrl: "https://github.com/acme/shop/pull/1",
    });

    expect(mockEnqueueFrameworkGeneratedEmail).toHaveBeenCalledWith({
      email: "creator@example.com",
      name: "Creator",
      sessionId: session.id,
      applicationName: "Shop",
      frameworkName: "Playwright",
      repositoryUrl: "https://github.com/acme/shop",
      branchName: "codegen/1",
      changedFiles: ["tests/regression.spec.ts"],
      noChanges: false,
      pushed: true,
      pullRequestUrl: "https://github.com/acme/shop/pull/1",
    });
  });

  test("enqueues framework failure email for session creator", async () => {
    await svc.notifyCodegenSession(session.id, {
      status: "failed",
      errorMessage: "push failed",
    });

    expect(mockEnqueueFrameworkGenerationFailedEmail).toHaveBeenCalledWith({
      email: "creator@example.com",
      name: "Creator",
      sessionId: session.id,
      applicationName: "Shop",
      frameworkName: "Playwright",
      repositoryUrl: "https://github.com/acme/shop",
      errorMessage: "push failed",
    });
  });

  test("enqueues issue created email for created scenario reports", async () => {
    await svc.notifyScenarioReportUpdated(
      scenarioReport({
        status: "CREATED",
        externalIssueKey: "COV-1",
        externalIssueUrl: "https://site.atlassian.net/browse/COV-1",
      }),
      { terminalFailureAttemptCount: 5 },
    );

    expect(mockEnqueueIssueCreatedEmail).toHaveBeenCalledWith({
      email: "user@example.com",
      provider: "jira",
      key: "COV-1",
      title: "Checkout fails",
      url: "https://site.atlassian.net/browse/COV-1",
      status: "created",
      reportId: "report-1",
    });
  });

  test("enqueues issue failed email only for terminal scenario report failures", async () => {
    await svc.notifyScenarioReportUpdated(
      scenarioReport({
        status: "FAILED",
        attemptCount: 4,
        lastError: "temporary",
      }),
      { terminalFailureAttemptCount: 5 },
    );
    expect(mockEnqueueIssueFailedEmail).not.toHaveBeenCalled();

    await svc.notifyScenarioReportUpdated(
      scenarioReport({
        status: "FAILED",
        attemptCount: 5,
        lastError: "no permission",
      }),
      { terminalFailureAttemptCount: 5 },
    );

    expect(mockEnqueueIssueFailedEmail).toHaveBeenCalledWith({
      email: "user@example.com",
      provider: "jira",
      title: "Checkout fails",
      errorMessage: "no permission",
      reportId: "report-1",
    });
  });
});
