// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export type ArtifactUploadInput = {
  path: string;
  content: Buffer;
  contentType?: string;
};

export type ArtifactUploadResult = {
  provider: string;
  uri: string;
  path: string;
};
