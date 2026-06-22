// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export type CrawlConfigDefaults = {
  maxStates: number;
  maxDepth: number;
  includeUrlPatterns: string[];
  excludeUrlPatterns: string[];
  enableSemanticDecisions: boolean;
  timeoutSeconds: number;
};

export const DEFAULT_CRAWL_CONFIG: CrawlConfigDefaults = {
  maxStates: 1000,
  maxDepth: 10,
  includeUrlPatterns: [],
  excludeUrlPatterns: [],
  enableSemanticDecisions: false,
  timeoutSeconds: 3600,
};
