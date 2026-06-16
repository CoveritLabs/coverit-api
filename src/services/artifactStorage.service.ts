// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { env } from "@config/env";
import { BadRequestError } from "@utils/errors";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { ArtifactStorage } from "@models/artifactStorage";
import type { ArtifactUploadInput, ArtifactUploadResult } from "types/artifactStorage";

export class DagsHubArtifactStorage implements ArtifactStorage {
  private client: S3Client | null = null;

  /**
   * Initializes and caches the S3-compatible DagsHub client
   */
  private getClient(): S3Client {
    if (this.client) return this.client;

    this.assertConfigured();

    const owner = env.DAGSHUB_OWNER ?? "";
    const token = env.DAGSHUB_TOKEN ?? "";

    this.client = new S3Client({
      endpoint: `https://dagshub.com/api/v1/repo-buckets/s3/${owner}`,
      region: "us-east-1",
      credentials: {
        accessKeyId: token,
        secretAccessKey: token,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    return this.client;
  }

  async upload(input: ArtifactUploadInput): Promise<ArtifactUploadResult> {
    const s3 = this.getClient();

    const bucket = env.DAGSHUB_BUCKET_NAME ?? "";
    const cleanPath = encodeArtifactPath(input.path);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: cleanPath,
      Body: input.content,
      ContentType: input.contentType ?? "application/octet-stream",
    });

    try {
      await s3.send(command);

      return {
        provider: "dagshub-storage",
        uri: `s3://${bucket}/${cleanPath}`,
        path: input.path,
      };
    } catch (error) {
      throw new Error(`DagsHub Storage upload failed: ${(error as Error).message}`);
    }
  }

  async read(path: string): Promise<{ content: Buffer; contentType?: string }> {
    const s3 = this.getClient();
    const bucket = env.DAGSHUB_BUCKET_NAME ?? "";
    const cleanPath = encodeArtifactPath(path);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: cleanPath,
    });

    try {
      const response = await s3.send(command);

      let content = Buffer.alloc(0);
      if (response.Body) {
        // Uniform SDK v3 way to transform streaming data into a native buffer
        const byteArray = await response.Body.transformToByteArray();
        content = Buffer.from(byteArray);
      }

      return {
        content,
        contentType: response.ContentType,
      };
    } catch (error) {
      throw new Error(`DagsHub Storage read failed: ${(error as Error).message}`);
    }
  }

  publicUrl(path: string): string {
    const owner = env.DAGSHUB_OWNER ?? "";
    const bucket = env.DAGSHUB_BUCKET_NAME ?? "";
    return `https://dagshub.com/api/v1/repo-buckets/s3/${owner}/${bucket}/${encodeArtifactPath(path)}`;
  }

  private assertConfigured(): void {
    if (!env.DAGSHUB_OWNER || !env.DAGSHUB_TOKEN) {
      throw new BadRequestError("DagsHub artifact storage is not configured");
    }
  }
}

function encodeArtifactPath(path: string): string {
  // Strip leading and trailing slashes to keep storage paths clean
  return path.replace(/^\/+|\/+$/g, "");
}

export const artifactStorage: ArtifactStorage = new DagsHubArtifactStorage();
