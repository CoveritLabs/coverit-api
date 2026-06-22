// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { env } from "@config/env";
import { INTEGRATIONS_MESSAGES, REGRESSION_RUN_MESSAGES, SCENARIO_REPORT_MESSAGES } from "@constants/messages";
import prisma from "@lib/prisma";
import { getIntegrationProvider } from "integrations/providers";
import { mapIntegrationReportingConfig } from "@mappers/integrations.mapper";
import {
  cleanReportDescription,
  isDownloadableArtifact,
  isReportableScenario,
  mapScenarioIntegrationReport,
  mapStructuredScenarioReportDescription,
  selectScenarioArtifacts,
  toDbReportStatus,
  toStoredReportProvider,
  uniqueStrings,
} from "@mappers/scenarioReports.mapper";
import type {
  CreateScenarioIntegrationReportBody,
  CreateScenarioIntegrationReportResponse,
  InternalClaimScenarioReportBody,
  InternalPatchScenarioReportBody,
  InternalScenarioReportContextResponse,
} from "@models/scenarioReports";
import { artifactStorage } from "@services/artifactStorage.service";
import { getValidJiraAccess } from "@services/integrations.service";
import { getUser } from "@services/user.service";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@utils/errors";
import { ARTIFACT_STORAGE } from "@constants/artifactStorage";
import { notifyScenarioReportUpdated } from "@services/notifications.service";

const MAX_REPORT_ATTEMPTS = 5;

export function assertInternalServiceToken(token?: string | string[]): void {
  const value = Array.isArray(token) ? token[0] : token;
  if (!value) throw new UnauthorizedError(SCENARIO_REPORT_MESSAGES.INTERNAL_TOKEN_REQUIRED);
  if (!env.INTERNAL_SERVICE_TOKEN || value !== env.INTERNAL_SERVICE_TOKEN) {
    throw new UnauthorizedError(SCENARIO_REPORT_MESSAGES.INTERNAL_TOKEN_INVALID);
  }
}

export async function createScenarioReport(
  projectId: string,
  appId: string,
  runId: string,
  scenarioId: string,
  provider: string,
  userId: string,
  body: CreateScenarioIntegrationReportBody,
): Promise<CreateScenarioIntegrationReportResponse> {
  const providerConfig = getIntegrationProvider(provider);
  const storedProvider = providerConfig.storedProvider;

  const app = await (prisma as any).targetApplication.findUnique({ where: { id: appId } });
  if (!app || app.projectId !== projectId) throw new NotFoundError(REGRESSION_RUN_MESSAGES.APPLICATION_MISMATCH);

  const run = await (prisma as any).regressionRun.findUnique({
    where: { targetApplicationId_runId: { targetApplicationId: appId, runId } },
  });
  if (!run) throw new NotFoundError(REGRESSION_RUN_MESSAGES.RUN_NOT_FOUND);

  const scenario = await (prisma as any).regressionScenario.findFirst({ where: { id: scenarioId, runDbId: run.id } });
  if (!scenario) throw new NotFoundError(REGRESSION_RUN_MESSAGES.SCENARIO_NOT_FOUND);
  if (!isReportableScenario(scenario)) throw new BadRequestError(SCENARIO_REPORT_MESSAGES.SCENARIO_NOT_REPORTABLE);

  const integration = await (prisma as any).projectIntegration.findUnique({
    where: { projectId_provider: { projectId, provider: storedProvider } },
  });
  if (!integration) throw new NotFoundError(INTEGRATIONS_MESSAGES.JIRA_NOT_CONNECTED);

  const reportingConfig = mapIntegrationReportingConfig(providerConfig.apiProvider, integration.reportingConfig);
  if (reportingConfig.case === undefined || !reportingConfig.value.enabled) {
    throw new BadRequestError(SCENARIO_REPORT_MESSAGES.REPORTING_NOT_CONFIGURED);
  }

  const reporter = await getUser(userId);
  const artifactIds = uniqueStrings(body.artifactIds);
  await assertScenarioArtifacts(run.id, scenario, artifactIds);

  const report = await (prisma as any).$transaction(async (tx: any) => {
    const existing = await tx.scenarioIntegrationReport.findUnique({
      where: { scenarioId_provider: { scenarioId, provider: storedProvider } },
    });

    if (existing) {
      if (existing.status === "FAILED") {
        return tx.scenarioIntegrationReport.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            title: body.title,
            description: cleanReportDescription(body.description),
            reporterUserId: reporter.id,
            reporterEmail: reporter.email,
            artifactIds,
            lastError: null,
          },
        });
      }

      return existing;
    }

    return tx.scenarioIntegrationReport.create({
      data: {
        projectId,
        runDbId: run.id,
        scenarioId,
        provider: storedProvider,
        status: "PENDING",
        title: body.title,
        description: cleanReportDescription(body.description),
        reporterUserId: reporter.id,
        reporterEmail: reporter.email,
        artifactIds,
      },
    });
  });

  return { report: mapScenarioIntegrationReport(report) };
}

export async function claimScenarioReport(body: InternalClaimScenarioReportBody): Promise<CreateScenarioIntegrationReportResponse | null> {
  const storedProvider = body.provider ? toStoredReportProvider(body.provider) : undefined;
  const where: any = {
    status: { in: ["PENDING", "FAILED"] },
    attemptCount: { lt: MAX_REPORT_ATTEMPTS },
  };
  if (storedProvider) where.provider = storedProvider;

  const candidate = body.reportId
    ? await (prisma as any).scenarioIntegrationReport.findFirst({ where: { ...where, id: body.reportId } })
    : await (prisma as any).scenarioIntegrationReport.findFirst({ where, orderBy: { createdAt: "asc" } });

  if (!candidate) return null;

  const updated = await (prisma as any).scenarioIntegrationReport.updateMany({
    where: {
      id: candidate.id,
      status: { in: ["PENDING", "FAILED"] },
      attemptCount: { lt: MAX_REPORT_ATTEMPTS },
    },
    data: {
      status: "CREATING",
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      lastError: null,
    },
  });

  if (updated.count !== 1) return null;

  const report = await (prisma as any).scenarioIntegrationReport.findUnique({ where: { id: candidate.id } });
  return { report: mapScenarioIntegrationReport(report) };
}

export async function getScenarioReportContext(reportId: string): Promise<InternalScenarioReportContextResponse> {
  const report = await findReport(reportId);
  const providerConfig = getIntegrationProvider(mapScenarioIntegrationReport(report).provider);
  const access = await getValidJiraAccess(report.projectId);
  const integration = await (prisma as any).projectIntegration.findUnique({
    where: { projectId_provider: { projectId: report.projectId, provider: providerConfig.storedProvider } },
  });
  if (!integration) throw new NotFoundError(INTEGRATIONS_MESSAGES.JIRA_NOT_CONNECTED);

  const reportingConfig = mapIntegrationReportingConfig(providerConfig.apiProvider, integration.reportingConfig);
  if (reportingConfig.case === undefined || !reportingConfig.value.enabled) {
    throw new BadRequestError(SCENARIO_REPORT_MESSAGES.REPORTING_NOT_CONFIGURED);
  }

  const artifacts = await (prisma as any).regressionArtifact.findMany({
    where: { id: { in: report.artifactIds ?? [] }, runDbId: report.runDbId },
    orderBy: { createdAt: "asc" },
  });

  return {
    report: mapScenarioIntegrationReport(report),
    access: {
      provider: providerConfig.apiProvider,
      tokenType: access.tokenType,
      accessToken: access.accessToken,
      cloudId: access.cloudId,
      siteUrl: access.siteUrl,
    },
    reportingConfig: reportingConfig.value,
    artifacts: artifacts.filter(isDownloadableArtifact).map((artifact: any) => ({
      id: artifact.id,
      name: artifact.name,
      contentType: artifact.contentType ?? undefined,
      sizeBytes: artifact.sizeBytes == null ? undefined : Number(artifact.sizeBytes),
    })),
    structuredDescription: mapStructuredScenarioReportDescription(report),
  };
}

export async function downloadScenarioReportArtifact(
  reportId: string,
  artifactId: string,
): Promise<{ content: Buffer; contentType: string; name: string }> {
  const report = await findReport(reportId);
  if (!(report.artifactIds ?? []).includes(artifactId)) throw new NotFoundError(REGRESSION_RUN_MESSAGES.ARTIFACT_NOT_FOUND);

  const artifact = await (prisma as any).regressionArtifact.findFirst({
    where: { id: artifactId, runDbId: report.runDbId },
  });
  if (!artifact || !isDownloadableArtifact(artifact)) throw new NotFoundError(REGRESSION_RUN_MESSAGES.ARTIFACT_NOT_FOUND);

  const stored = await artifactStorage.read(artifact.storagePath);
  return {
    content: stored.content,
    contentType: stored.contentType ?? artifact.contentType ?? ARTIFACT_STORAGE.DEFAULT_CONTENT_TYPE,
    name: artifact.name,
  };
}

export async function patchScenarioReport(
  reportId: string,
  body: InternalPatchScenarioReportBody,
): Promise<CreateScenarioIntegrationReportResponse> {
  const data: Record<string, any> = {};
  if (body.status) data.status = toDbReportStatus(body.status);
  if (body.externalIssueKey !== undefined) data.externalIssueKey = body.externalIssueKey;
  if (body.externalIssueUrl !== undefined) data.externalIssueUrl = body.externalIssueUrl;
  if (body.attachedArtifactIds !== undefined) data.attachedArtifactIds = uniqueStrings(body.attachedArtifactIds);
  if (body.lastError !== undefined) data.lastError = body.lastError;
  if (body.providerData !== undefined) data.providerData = body.providerData as any;

  const report = await (prisma as any).scenarioIntegrationReport.update({
    where: { id: reportId },
    data,
  });
  await notifyScenarioReportUpdated(report, { terminalFailureAttemptCount: MAX_REPORT_ATTEMPTS });
  return { report: mapScenarioIntegrationReport(report) };
}

async function findReport(reportId: string): Promise<any> {
  const report = await (prisma as any).scenarioIntegrationReport.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError(SCENARIO_REPORT_MESSAGES.REPORT_NOT_FOUND);
  return report;
}

async function assertScenarioArtifacts(runDbId: string, scenario: any, artifactIds: string[]): Promise<void> {
  if (artifactIds.length === 0) return;
  const artifacts = await (prisma as any).regressionArtifact.findMany({ where: { runDbId }, orderBy: { createdAt: "asc" } });
  const selectable = selectScenarioArtifacts(artifacts.filter(isDownloadableArtifact), scenario);
  const selectableIds = new Set(selectable.map((artifact: any) => artifact.id));
  if (!artifactIds.every((artifactId) => selectableIds.has(artifactId))) {
    throw new BadRequestError(SCENARIO_REPORT_MESSAGES.ARTIFACTS_NOT_FOUND);
  }
}
