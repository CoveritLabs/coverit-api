// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

export function normalizeUrlOrigin(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  return new URL(url).origin.toLowerCase();
}
