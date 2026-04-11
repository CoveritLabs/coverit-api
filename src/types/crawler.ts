// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export type CrawlJobPayload = {
  base_url: string;
  session_id?: string;
  max_states?: number;
  max_transitions?: number;
  headless?: boolean;
  config_path?: string;
};
