// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export type InputDefaultsConfig = {
    fieldPatterns: Record<string, string>;
    typeFallbacks: Record<string, string>;
};

export type CrawlerRunSettings = {
    headless?: boolean;
    timeoutMs?: number;
    maxStates?: number;
    maxTransitions?: number;
    maxElementsPerState?: number;
    maxSelectOptionsPerElement?: number;
    maxActionRepeatsPerUrl?: number;
    actionRetryCount?: number;
    replayRetryCount?: number;
    popupTimeoutMs?: number;
    domQuietMs?: number;
    domSettleTimeoutMs?: number;
    useDomQuiescence?: boolean;
    pageLoadState?: string;
    clickNonHttpLinks?: boolean;
    deferDestructiveActions?: boolean;
    destructiveKeywords?: string;
};
