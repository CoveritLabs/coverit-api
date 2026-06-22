// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export type CrawlConfigDefaults = {
  maxStates: number;
  timeoutSeconds: number;
  generateTestFlows: boolean;
  crawlerSettings: Record<string, never>;
  testFlowGeneration: {
    coveragePercentage: number;
    numOfTf: number;
    numOfStates: number;
    minNumOfStatesPerTf: number;
  };
};

export const TEST_FLOW_GENERATION_MAX_TF = 10000;

export const DEFAULT_CRAWL_CONFIG: CrawlConfigDefaults = {
  maxStates: 1000,
  timeoutSeconds: 3600,
  generateTestFlows: true,
  crawlerSettings: {},
  testFlowGeneration: {
    coveragePercentage: 100,
    numOfTf: 1,
    numOfStates: 20,
    minNumOfStatesPerTf: 3,
  },
};
