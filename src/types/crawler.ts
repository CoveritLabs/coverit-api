// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export type InputDefaultsConfig = {
    field_patterns: Record<string, string>;
    type_fallbacks: Record<string, string>;
};

export type CrawlerRunSettings = {
    headless?: boolean;
    timeout_ms?: number;
    max_states?: number;
    max_transitions?: number;
    max_elements_per_state?: number;
    max_select_options_per_element?: number;
    max_action_repeats_per_url?: number;
    action_retry_count?: number;
    replay_retry_count?: number;
    popup_timeout_ms?: number;
    dom_quiet_ms?: number;
    dom_settle_timeout_ms?: number;
    use_dom_quiescence?: boolean;
    page_load_state?: string;
    click_non_http_links?: boolean;
    defer_destructive_actions?: boolean;
    destructive_keywords?: string;
};
