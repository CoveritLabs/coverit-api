// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import crypto from "crypto";

import { env } from "@config/env";
import { INTEGRATIONS_MESSAGES } from "@constants/messages";
import { BadRequestError } from "@utils/errors";

function getOAuthTokenEncryptionKey(): Buffer {
  const key = Buffer.from(env.OAUTH_TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.TOKEN_ENCRYPTION_NOT_CONFIGURED);
  }

  return key;
}

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getOAuthTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptToken(payload: string): string {
  const [version, iv, tag, encrypted] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new BadRequestError(INTEGRATIONS_MESSAGES.TOKEN_ENCRYPTION_NOT_CONFIGURED);
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", getOAuthTokenEncryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
