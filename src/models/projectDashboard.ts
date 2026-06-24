// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { z } from "@utils/zod";
import type { infer as ZodInfer } from "zod";

export interface ProjectDashboardTotals {
  totalStates: number;
  totalTransitions: number;
  totalOnDemandSessions: number;
  totalRuns: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  reportedWarningCount: number;
  reportedFailedCount: number;
}

export interface ProjectCoveragePoint {
  applicationId: string;
  applicationName: string;
  versionId: string;
  version: string;
  percentage: number;
  coveredTransitions: number;
  totalTransitions: number;
  totalStates: number;
  sessionCount: number;
  calculatedAt?: string;
}

export interface ProjectRunTrendPoint {
  id: string;
  runId: string;
  displayName: string;
  status: string;
  applicationId: string;
  applicationName: string;
  versionId?: string;
  version?: string;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  durationMs?: number;
  createdAt: string;
}

export interface ProjectCrawlSessionTrendPoint {
  id: string;
  applicationId: string;
  applicationName: string;
  versionId: string;
  version: string;
  stateCount: number;
  transitionCount: number;
  createdAt: string;
  finishedAt?: string;
}

export interface ProjectTestFlowBreakdownPoint {
  type: string;
  count: number;
  totalSteps: number;
  generatedCount: number;
  staleCount: number;
  pendingCount: number;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  message: string;
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  createdAt: string;
}

export interface ProjectDashboardResponse {
  totals: ProjectDashboardTotals;
  coverageByApplication: ProjectCoveragePoint[];
  coverageByVersion: ProjectCoveragePoint[];
  runTrend: ProjectRunTrendPoint[];
  crawlSessionTrend: ProjectCrawlSessionTrendPoint[];
  testFlowBreakdown: ProjectTestFlowBreakdownPoint[];
  recentActivities: ProjectActivity[];
}

export const ProjectDashboardQuerySchema = z.object({});

export type ProjectDashboardQuery = ZodInfer<typeof ProjectDashboardQuerySchema>;

export const ProjectDashboardTotalsSchema = z.object({
  totalStates: z.number(),
  totalTransitions: z.number(),
  totalOnDemandSessions: z.number(),
  totalRuns: z.number(),
  passedCount: z.number(),
  warningCount: z.number(),
  failedCount: z.number(),
  reportedWarningCount: z.number(),
  reportedFailedCount: z.number(),
});

export const ProjectCoveragePointSchema = z.object({
  applicationId: z.string(),
  applicationName: z.string(),
  versionId: z.string(),
  version: z.string(),
  percentage: z.number(),
  coveredTransitions: z.number(),
  totalTransitions: z.number(),
  totalStates: z.number(),
  sessionCount: z.number(),
  calculatedAt: z.string().optional(),
});

export const ProjectRunTrendPointSchema = z.object({
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
  durationMs: z.number().optional(),
  createdAt: z.string(),
});

export const ProjectCrawlSessionTrendPointSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  applicationName: z.string(),
  versionId: z.string(),
  version: z.string(),
  stateCount: z.number(),
  transitionCount: z.number(),
  createdAt: z.string(),
  finishedAt: z.string().optional(),
});

export const ProjectTestFlowBreakdownPointSchema = z.object({
  type: z.string(),
  count: z.number(),
  totalSteps: z.number(),
  generatedCount: z.number(),
  staleCount: z.number(),
  pendingCount: z.number(),
});

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
});

export const ProjectDashboardResponseSchema = z.object({
  totals: ProjectDashboardTotalsSchema,
  coverageByApplication: z.array(ProjectCoveragePointSchema),
  coverageByVersion: z.array(ProjectCoveragePointSchema),
  runTrend: z.array(ProjectRunTrendPointSchema),
  crawlSessionTrend: z.array(ProjectCrawlSessionTrendPointSchema),
  testFlowBreakdown: z.array(ProjectTestFlowBreakdownPointSchema),
  recentActivities: z.array(ProjectActivitySchema),
});
