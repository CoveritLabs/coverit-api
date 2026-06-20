// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

jest.mock("@lib/prisma", () => require("../mocks/prisma"));
jest.mock("@services/user.service", () => ({ getUser: jest.fn() }));
jest.mock("@services/integrations.service", () => ({ getValidJiraAccess: jest.fn() }));
jest.mock("@services/artifactStorage.service", () => ({ artifactStorage: { read: jest.fn() } }));

import prisma from "@lib/prisma";
import { SCENARIO_REPORT_MESSAGES } from "@constants/messages";
import { getUser } from "@services/user.service";
import { getValidJiraAccess } from "@services/integrations.service";
import * as svc from "@services/scenarioReports.service";

const mockPrisma = prisma as any;
const mockGetUser = getUser as jest.Mock;
const mockGetValidJiraAccess = getValidJiraAccess as jest.Mock;

const now = new Date("2026-06-19T12:00:00.000Z");
const app = { id: "app1", projectId: "p1" };
const run = { id: "run-db-1", runId: "run-1", targetApplicationId: "app1" };
const failedScenario = {
  id: "scenario-1",
  runDbId: "run-db-1",
  status: "FAILED",
  warningCount: 0,
  scenarioName: "Checkout fails",
};
const warningScenario = {
  ...failedScenario,
  status: "PASSED",
  warningCount: 1,
};
const uploadedArtifact = {
  id: "artifact-1",
  runDbId: "run-db-1",
  scenarioId: "scenario-1",
  name: "failure.png",
  contentType: "image/png",
  sizeBytes: BigInt(12),
  storagePath: "path/failure.png",
  storageUri: "s3://bucket/path/failure.png",
  uploadStatus: "UPLOADED",
  metadata: {},
  createdAt: now,
  updatedAt: now,
};
const integration = {
  reportingConfig: {
    enabled: true,
    project: { id: "10000", key: "COV", name: "CoverIt" },
    issueType: { id: "10001", name: "Bug" },
  },
};

function report(overrides: Record<string, any> = {}) {
  return {
    id: "report-1",
    projectId: "p1",
    runDbId: "run-db-1",
    scenarioId: "scenario-1",
    provider: "JIRA",
    status: "PENDING",
    title: "Checkout fails",
    description: "Broken checkout",
    reporterUserId: "u1",
    reporterEmail: "user@example.com",
    artifactIds: ["artifact-1"],
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

describe("scenarioReports.service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: Function) => fn(mockPrisma));
    mockPrisma.targetApplication.findUnique.mockResolvedValue(app);
    mockPrisma.regressionRun.findUnique.mockResolvedValue(run);
    mockPrisma.regressionScenario.findFirst.mockResolvedValue(failedScenario);
    mockPrisma.projectIntegration.findUnique.mockResolvedValue(integration);
    mockPrisma.regressionArtifact.findMany.mockResolvedValue([uploadedArtifact]);
    mockPrisma.scenarioIntegrationReport.findUnique.mockResolvedValue(null);
    mockPrisma.scenarioIntegrationReport.create.mockResolvedValue(report());
    mockGetUser.mockResolvedValue({ id: "u1", email: "user@example.com", name: "User" });
    mockGetValidJiraAccess.mockResolvedValue({
      provider: "jira",
      tokenType: "Bearer",
      accessToken: "access-token",
      cloudId: "cloud-1",
      siteUrl: "https://site.atlassian.net",
    });
  });

  test("creates one pending provider report for a failed scenario", async () => {
    const response = await svc.createScenarioReport("p1", "app1", "run-1", "scenario-1", "jira", "u1", {
      title: "Checkout fails",
      description: "Broken checkout",
      artifactIds: ["artifact-1"],
    });

    expect(response.report).toMatchObject({
      id: "report-1",
      provider: "jira",
      status: "pending",
      artifactIds: ["artifact-1"],
      reporterEmail: "user@example.com",
    });
    expect(mockPrisma.scenarioIntegrationReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scenarioId: "scenario-1",
          provider: "JIRA",
          status: "PENDING",
          description: "Broken checkout",
        }),
      }),
    );
  });

  test("stores trimmed user description without provider footer", async () => {
    await svc.createScenarioReport("p1", "app1", "run-1", "scenario-1", "jira", "u1", {
      title: "Checkout fails",
      description: "  Broken checkout  ",
      artifactIds: [],
    });

    expect(mockPrisma.scenarioIntegrationReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "Broken checkout",
        }),
      }),
    );
  });

  test("allows passed scenarios with warnings", async () => {
    mockPrisma.regressionScenario.findFirst.mockResolvedValue(warningScenario);

    await expect(
      svc.createScenarioReport("p1", "app1", "run-1", "scenario-1", "jira", "u1", {
        title: "Checkout warns",
        description: "Warning checkout",
        artifactIds: [],
      }),
    ).resolves.toMatchObject({ report: expect.objectContaining({ provider: "jira" }) });
  });

  test("rejects passed scenarios without warnings", async () => {
    mockPrisma.regressionScenario.findFirst.mockResolvedValue({ ...failedScenario, status: "PASSED", warningCount: 0 });

    await expect(
      svc.createScenarioReport("p1", "app1", "run-1", "scenario-1", "jira", "u1", {
        title: "Clean scenario",
        description: "No issue",
        artifactIds: [],
      }),
    ).rejects.toThrow(SCENARIO_REPORT_MESSAGES.SCENARIO_NOT_REPORTABLE);
  });

  test("returns an existing non-failed report without creating duplicates", async () => {
    mockPrisma.scenarioIntegrationReport.findUnique.mockResolvedValue(report({ status: "CREATING" }));

    const response = await svc.createScenarioReport("p1", "app1", "run-1", "scenario-1", "jira", "u1", {
      title: "Retry",
      description: "Retry",
      artifactIds: ["artifact-1"],
    });

    expect(response.report.status).toBe("creating");
    expect(mockPrisma.scenarioIntegrationReport.create).not.toHaveBeenCalled();
  });

  test("resets failed report with trimmed user description", async () => {
    mockPrisma.scenarioIntegrationReport.findUnique.mockResolvedValue(report({ status: "FAILED" }));
    mockPrisma.scenarioIntegrationReport.update.mockResolvedValue(report({ description: "Retry checkout" }));

    await svc.createScenarioReport("p1", "app1", "run-1", "scenario-1", "jira", "u1", {
      title: "Retry",
      description: "  Retry checkout  ",
      artifactIds: ["artifact-1"],
    });

    expect(mockPrisma.scenarioIntegrationReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          description: "Retry checkout",
          reporterEmail: "user@example.com",
        }),
      }),
    );
  });

  test("rejects artifacts that are not selectable for the scenario", async () => {
    await expect(
      svc.createScenarioReport("p1", "app1", "run-1", "scenario-1", "jira", "u1", {
        title: "Checkout fails",
        description: "Broken checkout",
        artifactIds: ["other-artifact"],
      }),
    ).rejects.toThrow(SCENARIO_REPORT_MESSAGES.ARTIFACTS_NOT_FOUND);
  });

  test("returns provider context with structured description", async () => {
    mockPrisma.scenarioIntegrationReport.findUnique.mockResolvedValue(report({ description: "Broken checkout" }));

    const response = await svc.getScenarioReportContext("report-1");

    expect(response.structuredDescription).toEqual({
      summary: "Broken checkout",
      metadata: {
        reportId: "report-1",
        scenarioId: "scenario-1",
        runId: "run-db-1",
        provider: "jira",
        reporterEmail: "user@example.com",
      },
      footer: "Generated automatically by CoverIt.",
      blocks: [
        { key: "description", type: "paragraph", title: "Description", text: "Broken checkout" },
        { key: "reporter", type: "metadata", title: "Reporter", text: "user@example.com" },
      ],
    });
  });
});
