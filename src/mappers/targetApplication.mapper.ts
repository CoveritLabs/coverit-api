// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { Prisma } from "@generated/prisma/client";
import type { TargetApplicationResponse } from "@models/targetApplication";

type TargetApplicationWithVersions = Prisma.TargetApplicationGetPayload<{ include: { versions: true } }>;

export function mapTargetApplication(app: TargetApplicationWithVersions): TargetApplicationResponse {
  const response: TargetApplicationResponse = {
    id: app.id,
    name: app.name,
    baseUrl: app.baseUrl,
    versions: app.versions.map((version) => ({ id: version.id, version: version.version })),
  };
  if (app.apiKeyPreview) response.apiKeyPreview = app.apiKeyPreview;
  if (app.apiKeyCreatedAt) response.apiKeyCreatedAt = app.apiKeyCreatedAt.toISOString();
  if (app.apiKeyRotatedAt) response.apiKeyRotatedAt = app.apiKeyRotatedAt.toISOString();
  return response;
}
