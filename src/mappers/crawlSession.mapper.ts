// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { CrawlStatus as PrismaCrawlStatus, CrawlTriggerType as PrismaCrawlTriggerType } from "@generated/prisma/client";
import { CrawlStatus, CrawlTriggerType } from "@models/crawlSession";

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
