// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { env } from "@config/env";
import { BadRequestError } from "@utils/errors";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ARTIFACT_STORAGE, ARTIFACT_STORAGE_MESSAGES } from "@constants/artifactStorage";
import type { ArtifactStorage } from "@models/artifactStorage";
import type { ArtifactUploadInput, ArtifactUploadResult } from "types/artifactStorage";
import { buildApplicationArtifactStoragePrefix } from "@utils/regressionArtifact";

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
      region: ARTIFACT_STORAGE.DAGSHUB_REGION,
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
    const cleanPath = this.encodeArtifactPath(input.path);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: cleanPath,
      Body: input.content,
      ContentType: input.contentType ?? ARTIFACT_STORAGE.DEFAULT_CONTENT_TYPE,
    });

    try {
      await s3.send(command);

      return {
        provider: ARTIFACT_STORAGE.DAGSHUB_PROVIDER,
        uri: `s3://${bucket}/${cleanPath}`,
        path: input.path,
      };
    } catch (error) {
      throw new Error(`${ARTIFACT_STORAGE_MESSAGES.DAGSHUB_UPLOAD_FAILED}: ${(error as Error).message}`);
    }
  }

  async deleteApplicationArtifacts(applicationId: string): Promise<void> {
    const s3 = this.getClient();
    const bucket = env.DAGSHUB_BUCKET_NAME ?? "";
    const prefix = `${this.encodeArtifactPath(buildApplicationArtifactStoragePrefix(applicationId))}/`;
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      let response;
      try {
        response = await s3.send(listCommand);
      } catch (error) {
        throw new Error(`${ARTIFACT_STORAGE_MESSAGES.DAGSHUB_LIST_FAILED}: ${(error as Error).message}`);
      }

      const keys = (response.Contents ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => Boolean(key));

      if (keys.length > 0) {
        await this.deleteKeys(s3, bucket, keys);
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  async read(path: string): Promise<{ content: Buffer; contentType?: string }> {
    const s3 = this.getClient();
    const bucket = env.DAGSHUB_BUCKET_NAME ?? "";
    const cleanPath = this.encodeArtifactPath(path);

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
      throw new Error(`${ARTIFACT_STORAGE_MESSAGES.DAGSHUB_READ_FAILED}: ${(error as Error).message}`);
    }
  }

  publicUrl(path: string): string {
    const owner = env.DAGSHUB_OWNER ?? "";
    const bucket = env.DAGSHUB_BUCKET_NAME ?? "";
    return `https://dagshub.com/api/v1/repo-buckets/s3/${owner}/${bucket}/${this.encodeArtifactPath(path)}`;
  }

  private assertConfigured(): void {
    if (!env.DAGSHUB_OWNER || !env.DAGSHUB_TOKEN) {
      throw new BadRequestError(ARTIFACT_STORAGE_MESSAGES.DAGSHUB_NOT_CONFIGURED);
    }
  }

  private async deleteKeys(s3: S3Client, bucket: string, keys: string[]): Promise<void> {
    for (const key of keys) {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      try {
        await s3.send(command);
      } catch (error) {
        throw new Error(`${ARTIFACT_STORAGE_MESSAGES.DAGSHUB_DELETE_FAILED}: ${key}: ${(error as Error).message}`);
      }
    }
  }

  private encodeArtifactPath(path: string): string {
    // Strip leading and trailing slashes to keep storage paths clean
    return path.replace(/^\/+|\/+$/g, "");
  }
}

export const artifactStorage: ArtifactStorage = new DagsHubArtifactStorage();
