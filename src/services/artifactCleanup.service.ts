// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { ArtifactStorage } from "@models/artifactStorage";
import { artifactStorage } from "@services/artifactStorage.service";

export async function deleteArtifactsForApplications(
  applicationIds: string[],
  storage: ArtifactStorage = artifactStorage,
): Promise<void> {
  const uniqueApplicationIds = [...new Set(applicationIds.filter(Boolean))];

  for (const applicationId of uniqueApplicationIds) {
    await storage.deleteApplicationArtifacts(applicationId);
  }
}
