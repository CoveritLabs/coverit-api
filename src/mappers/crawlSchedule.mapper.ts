// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { CrawlScheduleType, CrawlScheduleMode } from "@models/crawlSchedule";
import { CrawlScheduleType as PrismaCrawlScheduleType, CrawlScheduleMode as PrismaCrawlScheduleMode } from "@generated/prisma/client";

export const toDbCrawlScheduleType = (scheduleType: CrawlScheduleType): PrismaCrawlScheduleType => {
  const key = CrawlScheduleType[scheduleType] as unknown as keyof typeof PrismaCrawlScheduleType;
  return PrismaCrawlScheduleType[key] ?? PrismaCrawlScheduleType.UNSPECIFIED;
};

export const toDbCrawlScheduleMode = (scheduleMode: CrawlScheduleMode): PrismaCrawlScheduleMode => {
  const key = CrawlScheduleMode[scheduleMode] as unknown as keyof typeof PrismaCrawlScheduleMode;
  return PrismaCrawlScheduleMode[key] ?? PrismaCrawlScheduleMode.UNSPECIFIED;
};

export const fromDbCrawlScheduleType = <TDbType extends string>(scheduleType: TDbType): CrawlScheduleType => {
  return (CrawlScheduleType[scheduleType as unknown as keyof typeof CrawlScheduleType] ?? CrawlScheduleType.UNSPECIFIED) as CrawlScheduleType;
};

export const fromDbCrawlScheduleMode = <TDbMode extends string>(scheduleMode: TDbMode): CrawlScheduleMode => {
  return (CrawlScheduleMode[scheduleMode as unknown as keyof typeof CrawlScheduleMode] ?? CrawlScheduleMode.UNSPECIFIED) as CrawlScheduleMode;
};
