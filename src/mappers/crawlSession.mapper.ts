// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { CrawlStatus as PrismaCrawlStatus, CrawlTriggerType as PrismaCrawlTriggerType, Prisma } from "@generated/prisma/client";
import { CrawlStatus, CrawlTriggerType, type CrawlConfig, type CodegenConfig } from "@models/crawlSession";

type SemanticCrawlerSettings = {
  semanticDiversityThreshold?: number;
  semanticUncertaintyMargin?: number;
  semanticMaxBankSize?: number;
  semanticArtifactDir?: string;
};

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
  const settings = config.crawlerSettings as (NonNullable<CrawlConfig["crawlerSettings"]> & SemanticCrawlerSettings) | undefined;
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
  if (settings?.useSemanticDiversity !== undefined) crawlerSettings.use_semantic_diversity = settings.useSemanticDiversity;
  if (settings?.semanticDiversityThreshold !== undefined) crawlerSettings.semantic_diversity_threshold = settings.semanticDiversityThreshold;
  if (settings?.semanticUncertaintyMargin !== undefined) crawlerSettings.semantic_uncertainty_margin = settings.semanticUncertaintyMargin;
  if (settings?.semanticMaxBankSize !== undefined) crawlerSettings.semantic_max_bank_size = settings.semanticMaxBankSize;
  if (settings?.semanticArtifactDir !== undefined) crawlerSettings.semantic_artifact_dir = settings.semanticArtifactDir;

  const persisted: Record<string, Prisma.InputJsonValue> = {};
  if (config.maxStates !== undefined) persisted.maxStates = config.maxStates;
  if (config.maxDepth !== undefined) persisted.maxDepth = config.maxDepth;
  if (config.includeUrlPatterns !== undefined) persisted.includeUrlPatterns = config.includeUrlPatterns;
  if (config.excludeUrlPatterns !== undefined) persisted.excludeUrlPatterns = config.excludeUrlPatterns;
  if (config.enableSemanticDecisions !== undefined) persisted.enableSemanticDecisions = config.enableSemanticDecisions;
  if (config.timeoutSeconds !== undefined) persisted.timeoutSeconds = config.timeoutSeconds;
  if (Object.keys(crawlerSettings).length > 0) persisted.crawlerSettings = crawlerSettings;
  if (input) {
    persisted.inputDefaults = {
      field_patterns: input.fieldPatterns,
      type_fallbacks: input.typeFallbacks,
    };
  }

  return persisted;
};

const readObject = (value: unknown): Record<string, unknown> => {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
};

export const fromPersistedCrawlConfig = (value: unknown, defaults: Record<string, unknown>): CrawlConfig => {
  const persisted = readObject(value);
  const settings = readObject(persisted.crawlerSettings);
  const input = readObject(persisted.inputDefaults);

  const crawlerSettings = {
    headless: settings.headless,
    timeoutMs: settings.timeout_ms ?? settings.timeoutMs,
    maxStates: settings.max_states ?? settings.maxStates,
    maxTransitions: settings.max_transitions ?? settings.maxTransitions,
    maxElementsPerState: settings.max_elements_per_state ?? settings.maxElementsPerState,
    maxSelectOptionsPerElement: settings.max_select_options_per_element ?? settings.maxSelectOptionsPerElement,
    maxActionRepeatsPerUrl: settings.max_action_repeats_per_url ?? settings.maxActionRepeatsPerUrl,
    actionRetryCount: settings.action_retry_count ?? settings.actionRetryCount,
    replayRetryCount: settings.replay_retry_count ?? settings.replayRetryCount,
    popupTimeoutMs: settings.popup_timeout_ms ?? settings.popupTimeoutMs,
    domQuietMs: settings.dom_quiet_ms ?? settings.domQuietMs,
    domSettleTimeoutMs: settings.dom_settle_timeout_ms ?? settings.domSettleTimeoutMs,
    useDomQuiescence: settings.use_dom_quiescence ?? settings.useDomQuiescence,
    pageLoadState: settings.page_load_state ?? settings.pageLoadState,
    clickNonHttpLinks: settings.click_non_http_links ?? settings.clickNonHttpLinks,
    deferDestructiveActions: settings.defer_destructive_actions ?? settings.deferDestructiveActions,
    destructiveKeywords: settings.destructive_keywords ?? settings.destructiveKeywords,
    useSemanticDiversity: settings.use_semantic_diversity ?? settings.useSemanticDiversity,
    semanticDiversityThreshold: settings.semantic_diversity_threshold ?? settings.semanticDiversityThreshold,
    semanticUncertaintyMargin: settings.semantic_uncertainty_margin ?? settings.semanticUncertaintyMargin,
    semanticMaxBankSize: settings.semantic_max_bank_size ?? settings.semanticMaxBankSize,
    semanticArtifactDir: settings.semantic_artifact_dir ?? settings.semanticArtifactDir,
  };

  return {
    ...defaults,
    ...persisted,
    crawlerSettings,
    inputDefaults:
      Object.keys(input).length > 0
        ? {
            fieldPatterns: readObject(input.field_patterns ?? input.fieldPatterns) as Record<string, string>,
            typeFallbacks: readObject(input.type_fallbacks ?? input.typeFallbacks) as Record<string, string>,
          }
        : undefined,
  } as unknown as CrawlConfig;
};

export const toPersistedCodegenConfig = (config?: CodegenConfig | null): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  return config
    ? {
        codegenBranch: config.codegenBranch,
        prTargetBranch: config.prTargetBranch,
        prTitle: config.prTitle,
        prBody: config.prBody,
        prDraft: config.prDraft,
      }
    : Prisma.JsonNull;
};
