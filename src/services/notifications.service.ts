// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import prisma from "@lib/prisma";
import { CRAWL_SESSION_MESSAGES } from "@constants/messages";
import {
  enqueueFrameworkGeneratedEmail,
  enqueueFrameworkGenerationFailedEmail,
  enqueueIssueCreatedEmail,
  enqueueIssueFailedEmail,
} from "@queues/email.queue";
import { mapScenarioIntegrationReport } from "@mappers/scenarioReports.mapper";
import type { InternalCodegenNotificationBody } from "@models/notifications";
import type { MessageResponse } from "@models/common";
import { NotFoundError } from "@utils/errors";
import { logger } from "@services/logger.service";
import { markTestFlowsGenerated } from "@services/testFlow.service";

type ScenarioReportNotificationOptions = {
  terminalFailureAttemptCount: number;
};

export async function notifyCodegenSession(sessionId: string, body: InternalCodegenNotificationBody): Promise<MessageResponse> {
  const session = await (prisma as any).crawlSession.findUnique({
    where: { id: sessionId },
    include: {
      creator: true,
      regressionCodebase: true,
      appVersion: {
        include: {
          targetApplication: true,
        },
      },
    },
  });

  if (!session) throw new NotFoundError(CRAWL_SESSION_MESSAGES.NOT_FOUND);

  const creator = session.creator;
  const targetApplication = session.appVersion?.targetApplication;
  const regressionCodebase = session.regressionCodebase;
  const applicationName = targetApplication?.name ?? "Target application";

  if (body.status === "generated") {
    await markTestFlowsGenerated(session.id, body.flowIds);
  }

  try {
    if (body.status === "generated") {
      await enqueueFrameworkGeneratedEmail({
        email: creator.email,
        name: creator.name,
        sessionId: session.id,
        applicationName,
        frameworkName: regressionCodebase?.frameworkName,
        repositoryUrl: regressionCodebase?.repositoryUrl,
        branchName: body.branchName,
        changedFiles: body.changedFiles,
        noChanges: body.noChanges,
        pushed: body.pushed,
        pullRequestUrl: body.pullRequestUrl,
      });
    } else {
      await enqueueFrameworkGenerationFailedEmail({
        email: creator.email,
        name: creator.name,
        sessionId: session.id,
        applicationName,
        frameworkName: regressionCodebase?.frameworkName,
        repositoryUrl: regressionCodebase?.repositoryUrl,
        errorMessage: body.errorMessage,
      });
    }
  } catch (error) {
    logger.error(error, "Could not enqueue framework generation notification email");
  }

  return { message: "Codegen notification accepted" };
}

export async function notifyScenarioReportUpdated(report: any, options: ScenarioReportNotificationOptions): Promise<void> {
  try {
    const mappedReport = mapScenarioIntegrationReport(report);

    if (report.status === "CREATED") {
      await enqueueIssueCreatedEmail({
        email: report.reporterEmail,
        provider: mappedReport.provider,
        key: report.externalIssueKey ?? "",
        title: report.title,
        url: report.externalIssueUrl,
        status: "created",
        reportId: report.id,
      });
      return;
    }

    if (report.status === "FAILED" && report.attemptCount >= options.terminalFailureAttemptCount) {
      await enqueueIssueFailedEmail({
        email: report.reporterEmail,
        provider: mappedReport.provider,
        title: report.title,
        errorMessage: report.lastError || "The issue could not be created.",
        reportId: report.id,
      });
    }
  } catch (error) {
    logger.error(error, "Could not enqueue scenario report notification email");
  }
}
