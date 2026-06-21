// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { env } from "@config/env";
import { logger } from "@services/logger.service";
import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }

  return resend;
}

export async function sendResetEmail(email: string, resetUrl: string, name: string): Promise<void> {
  const from = env.RESET_PASSWORD_EMAIL;
  const templateId = env.RESET_PASSWORD_TEMPLATE_ID;
  const resendClient = getResendClient();

  const { data, error } = await resendClient.emails.send({
    from,
    to: [email],
    subject: "Reset your Coverit password",
    template: {
      id: templateId,
      variables: {
        NAME: name,
        RESET_URL: resetUrl,
        EXPIRE_TIME: Math.ceil(env.RESET_TOKEN_TTL_SECONDS / 60),
      },
    },
  });

  if (error) {
    logger.error(error, "Error sending email:");
    return;
  }

  logger.info("Reset password email sent successfully!");
  logger.info(
    {
      email,
      messageId: data?.id,
    },
    "Reset password email sent",
  );
}

export async function sendIssueCreatedEmail(
  email: string,
  issueData: {
    provider: string;
    key: string;
    title: string;
    url?: string | null;
    status: string;
    reportId?: string;
  },
): Promise<void> {
  const from = env.NOTIFICATION_EMAIL;
  const templateId = env.ISSUE_CREATED_TEMPLATE_ID;
  const resendClient = getResendClient();

  const logos: Record<string, string> = {
    jira: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jira/jira-original.svg",
    github: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg",
  };

  const { data, error } = await resendClient.emails.send({
    from,
    to: [email],
    subject: `${issueData.provider} issue ${issueData.key} created`,
    template: {
      id: templateId,
      variables: {
        PROVIDER_NAME: issueData.provider,
        PROVIDER_LOGO_URL: logos[issueData.provider.toLowerCase()] || "",
        ISSUE_KEY: issueData.key,
        ISSUE_TITLE: issueData.title,
        ISSUE_URL: issueData.url || "",
        ISSUE_STATUS: issueData.status,
        REPORT_ID: issueData.reportId || "",
      },
    },
  });

  if (error) {
    logger.error(error, "Error sending email:");
    return;
  }

  logger.info("Issue created email sent successfully!");
  logger.info(
    {
      email,
      messageId: data?.id,
    },
    "Issue created email sent",
  );
}

export async function sendIssueFailedEmail(
  email: string,
  issueData: {
    provider: string;
    title: string;
    errorMessage: string;
    reportId?: string;
  },
): Promise<void> {
  const from = env.NOTIFICATION_EMAIL;
  const templateId = env.ISSUE_FAILED_TEMPLATE_ID;
  const resendClient = getResendClient();

  const { data, error } = await resendClient.emails.send({
    from,
    to: [email],
    subject: `${issueData.provider} issue creation failed`,
    template: {
      id: templateId,
      variables: {
        PROVIDER_NAME: issueData.provider,
        ISSUE_TITLE: issueData.title,
        ERROR_MESSAGE: issueData.errorMessage,
        REPORT_ID: issueData.reportId || "",
      },
    },
  });

  if (error) {
    logger.error(error, "Error sending email:");
    return;
  }

  logger.info("Issue failure email sent successfully!");
  logger.info(
    {
      email,
      messageId: data?.id,
    },
    "Issue failure email sent",
  );
}

export async function sendFrameworkGeneratedEmail(
  email: string,
  data: {
    name: string;
    sessionId: string;
    applicationName: string;
    frameworkName?: string;
    repositoryUrl?: string;
    branchName: string;
    changedFiles: string[];
    noChanges: boolean;
    pushed: boolean;
    pullRequestUrl?: string | null;
  },
): Promise<void> {
  const from = env.NOTIFICATION_EMAIL;
  const templateId = env.CODE_GENERATED_TEMPLATE_ID;
  const resendClient = getResendClient();

  const { data: responseData, error } = await resendClient.emails.send({
    from,
    to: [email],
    subject: data.noChanges ? "Coverit framework generation completed with no changes" : "Coverit framework generation completed",
    template: {
      id: templateId,
      variables: {
        NAME: data.name,
        SESSION_ID: data.sessionId,
        APPLICATION_NAME: data.applicationName,
        FRAMEWORK_NAME: data.frameworkName || "",
        REPOSITORY_URL: data.repositoryUrl || "",
        BRANCH_NAME: data.branchName,
        CHANGED_FILES_COUNT: data.changedFiles.length,
        CHANGED_FILES: data.changedFiles.join("\n"),
        NO_CHANGES: data.noChanges ? "true" : "false",
        PUSHED: data.pushed ? "true" : "false",
        PULL_REQUEST_URL: data.pullRequestUrl || "",
      },
    },
  });

  if (error) {
    logger.error(error, "Error sending email:");
    return;
  }

  logger.info("Framework generation email sent successfully!");
  logger.info(
    {
      email,
      messageId: responseData?.id,
    },
    "Framework generation email sent",
  );
}

export async function sendFrameworkGenerationFailedEmail(
  email: string,
  data: {
    name: string;
    sessionId: string;
    applicationName: string;
    frameworkName?: string;
    repositoryUrl?: string;
    errorMessage: string;
  },
): Promise<void> {
  const from = env.NOTIFICATION_EMAIL;
  const templateId = env.CODE_GENERATION_FAILED_TEMPLATE_ID;
  const resendClient = getResendClient();

  const { data: responseData, error } = await resendClient.emails.send({
    from,
    to: [email],
    subject: "Coverit framework generation failed",
    template: {
      id: templateId,
      variables: {
        NAME: data.name,
        SESSION_ID: data.sessionId,
        APPLICATION_NAME: data.applicationName,
        FRAMEWORK_NAME: data.frameworkName || "",
        REPOSITORY_URL: data.repositoryUrl || "",
        ERROR_MESSAGE: data.errorMessage,
      },
    },
  });

  if (error) {
    logger.error(error, "Error sending email:");
    return;
  }

  logger.info("Framework generation failure email sent successfully!");
  logger.info(
    {
      email,
      messageId: responseData?.id,
    },
    "Framework generation failure email sent",
  );
}
