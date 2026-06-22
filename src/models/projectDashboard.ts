// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type {
  ProjectActivity as ContractProjectActivity,
  ProjectCoverageSummary as ContractProjectCoverageSummary,
  ProjectDashboardResponse as ContractProjectDashboardResponse,
  ProjectDashboardVersionRef as ContractProjectDashboardVersionRef,
  ProjectLatestCrawlSession as ContractProjectLatestCrawlSession,
  ProjectLatestRun as ContractProjectLatestRun,
  ProjectLatestTestFlow as ContractProjectLatestTestFlow,
  ProjectRunStatistics as ContractProjectRunStatistics,
} from "@coveritlabs/contracts";
import { z } from "@utils/zod";
import type { infer as ZodInfer, ZodType } from "zod";
import type { Plain } from "./common";

export type ProjectDashboardVersionRef = Plain<ContractProjectDashboardVersionRef>;
export type ProjectCoverageSummary = Plain<ContractProjectCoverageSummary>;
export type ProjectRunStatistics = Plain<ContractProjectRunStatistics>;
export type ProjectLatestRun = Plain<ContractProjectLatestRun>;
export type ProjectLatestCrawlSession = Plain<ContractProjectLatestCrawlSession>;
export type ProjectLatestTestFlow = Plain<ContractProjectLatestTestFlow>;
export type ProjectActivity = Plain<ContractProjectActivity>;
export type ProjectDashboardResponse = Omit<
  Plain<ContractProjectDashboardResponse>,
  "coverage" | "runStatistics" | "latestRuns" | "latestCrawlSessions" | "latestTestFlows" | "recentActivities"
> & {
  coverage: ProjectCoverageSummary;
  runStatistics: ProjectRunStatistics;
  latestRuns: ProjectLatestRun[];
  latestCrawlSessions: ProjectLatestCrawlSession[];
  latestTestFlows: ProjectLatestTestFlow[];
  recentActivities: ProjectActivity[];
};

export const ProjectDashboardQuerySchema = z.object({
  versionId: z.string().optional(),
});

export type ProjectDashboardQuery = ZodInfer<typeof ProjectDashboardQuerySchema>;

export const ProjectDashboardVersionRefSchema = z.object({
  id: z.string(),
  version: z.string(),
  applicationId: z.string(),
  applicationName: z.string(),
}) satisfies ZodType<ProjectDashboardVersionRef>;

export const ProjectCoverageSummarySchema = z.object({
  percentage: z.number(),
  coveredTransitions: z.number(),
  totalTransitions: z.number(),
  crawlSessionId: z.string().optional(),
  calculatedAt: z.string().optional(),
}) satisfies ZodType<ProjectCoverageSummary>;

export const ProjectRunStatisticsSchema = z.object({
  passedCount: z.number(),
  warningCount: z.number(),
  failedCount: z.number(),
  reportedWarningCount: z.number(),
  reportedFailedCount: z.number(),
  totalRuns: z.number(),
}) satisfies ZodType<ProjectRunStatistics>;

export const ProjectLatestRunSchema = z.object({
  id: z.string(),
  runId: z.string(),
  displayName: z.string(),
  status: z.string(),
  applicationId: z.string(),
  applicationName: z.string(),
  versionId: z.string().optional(),
  version: z.string().optional(),
  passedCount: z.number(),
  warningCount: z.number(),
  failedCount: z.number(),
  createdAt: z.string(),
}) satisfies ZodType<ProjectLatestRun>;

export const ProjectLatestCrawlSessionSchema = z.object({
  id: z.string(),
  status: z.string(),
  triggerType: z.string(),
  applicationId: z.string(),
  applicationName: z.string(),
  versionId: z.string(),
  version: z.string(),
  stateCount: z.number(),
  transitionCount: z.number(),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
}) satisfies ZodType<ProjectLatestCrawlSession>;

export const ProjectLatestTestFlowSchema = z.object({
  id: z.string(),
  crawlSessionId: z.string(),
  applicationId: z.string(),
  applicationName: z.string(),
  versionId: z.string(),
  version: z.string(),
  checkpointStateHash: z.string(),
  checkpointUrl: z.string(),
  isClipped: z.boolean(),
  stepCount: z.number(),
  createdAt: z.string(),
}) satisfies ZodType<ProjectLatestTestFlow>;

export const ProjectActivitySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  eventType: z.string(),
  entityType: z.string(),
  entityId: z.string().optional(),
  message: z.string(),
  actorUserId: z.string().optional(),
  actorName: z.string().optional(),
  actorEmail: z.string().optional(),
  createdAt: z.string(),
}) satisfies ZodType<ProjectActivity>;

export const ProjectDashboardResponseSchema = z.object({
  selectedVersion: ProjectDashboardVersionRefSchema.optional(),
  coverage: ProjectCoverageSummarySchema,
  runStatistics: ProjectRunStatisticsSchema,
  latestRuns: z.array(ProjectLatestRunSchema),
  latestCrawlSessions: z.array(ProjectLatestCrawlSessionSchema),
  latestTestFlows: z.array(ProjectLatestTestFlowSchema),
  recentActivities: z.array(ProjectActivitySchema),
}) satisfies ZodType<ProjectDashboardResponse>;
