// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import type { ArtifactUploadInput, ArtifactUploadResult } from "types/artifactStorage";

export interface ArtifactStorage {
  upload(input: ArtifactUploadInput): Promise<ArtifactUploadResult>;
  read(path: string): Promise<{ content: Buffer; contentType?: string }>;
  publicUrl(path: string): string;
}
