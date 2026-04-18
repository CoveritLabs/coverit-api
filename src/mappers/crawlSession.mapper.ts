// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { CrawlStatus as PrismaCrawlStatus, CrawlTriggerType as PrismaCrawlTriggerType, type Prisma } from "@generated/prisma/client";
import { CrawlStatus, CrawlTriggerType, type CrawlConfig } from "@models/crawlSession";

export const toDbCrawlStatus = (status: CrawlStatus): PrismaCrawlStatus => {
    const key = CrawlStatus[status] as unknown as keyof typeof PrismaCrawlStatus;
    return PrismaCrawlStatus[key] ?? PrismaCrawlStatus.UNSPECIFIED;
};

export const toDbCrawlTriggerType = (triggerType: CrawlTriggerType): PrismaCrawlTriggerType => {
    const key = CrawlTriggerType[triggerType] as unknown as keyof typeof PrismaCrawlTriggerType;
    return PrismaCrawlTriggerType[key] ?? PrismaCrawlTriggerType.UNSPECIFIED;
};

export const toDbCrawlStatusFilter = <TDbStatus>(status?: CrawlStatus): TDbStatus | undefined => {
    if (status === undefined || status === CrawlStatus.UNSPECIFIED) return undefined;
    return toDbCrawlStatus(status) as unknown as TDbStatus;
};

export const toDbCrawlTriggerTypeFilter = <TDbTriggerType>(triggerType?: CrawlTriggerType): TDbTriggerType | undefined => {
    if (triggerType === undefined || triggerType === CrawlTriggerType.UNSPECIFIED) return undefined;
    return toDbCrawlTriggerType(triggerType) as unknown as TDbTriggerType;
};

export const fromDbCrawlStatus = <TDbStatus extends string>(status: TDbStatus): CrawlStatus => {
    return (CrawlStatus[status as unknown as keyof typeof CrawlStatus] ?? CrawlStatus.UNSPECIFIED) as CrawlStatus;
};

export const fromDbCrawlTriggerType = <TDbTriggerType extends string>(triggerType: TDbTriggerType): CrawlTriggerType => {
    return (CrawlTriggerType[triggerType as unknown as keyof typeof CrawlTriggerType] ?? CrawlTriggerType.UNSPECIFIED) as CrawlTriggerType;
};

export const toPersistedCrawlConfig = (config: CrawlConfig): Prisma.InputJsonValue => {
    const settings = config.crawlerSettings;
    const input = config.inputDefaults;

    const crawlerSettings: Record<string, Prisma.InputJsonValue> = {};
    if (settings?.headless !== undefined) crawlerSettings.headless = settings.headless;
    if (settings?.timeoutMs !== undefined) crawlerSettings.timeout_ms = settings.timeoutMs;
    if (settings?.maxStates !== undefined) crawlerSettings.max_states = settings.maxStates;
    if (settings?.maxTransitions !== undefined) crawlerSettings.max_transitions = settings.maxTransitions;
    if (settings?.maxElementsPerState !== undefined) crawlerSettings.max_elements_per_state = settings.maxElementsPerState;
    if (settings?.maxSelectOptionsPerElement !== undefined) {
        crawlerSettings.max_select_options_per_element = settings.maxSelectOptionsPerElement;
    }
    if (settings?.maxActionRepeatsPerUrl !== undefined) {
        crawlerSettings.max_action_repeats_per_url = settings.maxActionRepeatsPerUrl;
    }
    if (settings?.actionRetryCount !== undefined) crawlerSettings.action_retry_count = settings.actionRetryCount;
    if (settings?.replayRetryCount !== undefined) crawlerSettings.replay_retry_count = settings.replayRetryCount;
    if (settings?.popupTimeoutMs !== undefined) crawlerSettings.popup_timeout_ms = settings.popupTimeoutMs;
    if (settings?.domQuietMs !== undefined) crawlerSettings.dom_quiet_ms = settings.domQuietMs;
    if (settings?.domSettleTimeoutMs !== undefined) crawlerSettings.dom_settle_timeout_ms = settings.domSettleTimeoutMs;
    if (settings?.useDomQuiescence !== undefined) crawlerSettings.use_dom_quiescence = settings.useDomQuiescence;
    if (settings?.pageLoadState !== undefined) crawlerSettings.page_load_state = settings.pageLoadState;
    if (settings?.clickNonHttpLinks !== undefined) crawlerSettings.click_non_http_links = settings.clickNonHttpLinks;
    if (settings?.deferDestructiveActions !== undefined) {
        crawlerSettings.defer_destructive_actions = settings.deferDestructiveActions;
    }
    if (settings?.destructiveKeywords !== undefined) crawlerSettings.destructive_keywords = settings.destructiveKeywords;

    const persisted: Record<string, Prisma.InputJsonValue> = {};
    if (Object.keys(crawlerSettings).length > 0) persisted.crawlerSettings = crawlerSettings;
    if (input) {
        persisted.inputDefaults = {
            field_patterns: input.fieldPatterns,
            type_fallbacks: input.typeFallbacks,
        };
    }

    return persisted;
}