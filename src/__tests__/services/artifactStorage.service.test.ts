// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

const mockSend = jest.fn();

jest.mock("@config/env", () => ({
  env: {
    DAGSHUB_OWNER: "owner",
    DAGSHUB_TOKEN: "token",
    DAGSHUB_BUCKET_NAME: "bucket",
    DAGSHUB_ARTIFACT_PREFIX: "artifacts",
  },
}));

jest.mock("@aws-sdk/client-s3", () => {
  class S3Client {
    send = mockSend;
  }

  class PutObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class GetObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class ListObjectsV2Command {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class DeleteObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
  };
});

import { DagsHubArtifactStorage } from "@services/artifactStorage.service";

describe("artifactStorage.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deleteApplicationArtifacts - deletes all objects under application prefix", async () => {
    mockSend
      .mockResolvedValueOnce({
        Contents: [{ Key: "artifacts/app-1/file1" }, { Key: "artifacts/app-1/file2" }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const storage = new DagsHubArtifactStorage();
    await storage.deleteApplicationArtifacts("app 1");

    expect(mockSend).toHaveBeenCalledTimes(3);
    expect((mockSend.mock.calls[0][0] as any).input).toEqual({
      Bucket: "bucket",
      Prefix: "artifacts/app-1/",
      ContinuationToken: undefined,
    });
    expect((mockSend.mock.calls[1][0] as any).input).toEqual({
      Bucket: "bucket",
      Key: "artifacts/app-1/file1",
    });
    expect((mockSend.mock.calls[2][0] as any).input).toEqual({
      Bucket: "bucket",
      Key: "artifacts/app-1/file2",
    });
  });

  test("deleteApplicationArtifacts - handles paginated listings", async () => {
    mockSend
      .mockResolvedValueOnce({
        Contents: [{ Key: "artifacts/app-1/file1" }],
        IsTruncated: true,
        NextContinuationToken: "page-2",
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Contents: [{ Key: "artifacts/app-1/file2" }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({});

    const storage = new DagsHubArtifactStorage();
    await storage.deleteApplicationArtifacts("app-1");

    expect(mockSend).toHaveBeenCalledTimes(4);
    expect((mockSend.mock.calls[2][0] as any).input).toEqual({
      Bucket: "bucket",
      Prefix: "artifacts/app-1/",
      ContinuationToken: "page-2",
    });
  });

  test("deleteApplicationArtifacts - deletes every key from large listings", async () => {
    const keys = Array.from({ length: 1001 }, (_, index) => ({ Key: `artifacts/app-1/file-${index}` }));
    mockSend.mockResolvedValueOnce({
      Contents: keys,
      IsTruncated: false,
    });
    for (let index = 0; index < keys.length; index += 1) {
      mockSend.mockResolvedValueOnce({});
    }

    const storage = new DagsHubArtifactStorage();
    await storage.deleteApplicationArtifacts("app-1");

    expect(mockSend).toHaveBeenCalledTimes(1002);
    expect((mockSend.mock.calls[1][0] as any).input).toEqual({ Bucket: "bucket", Key: "artifacts/app-1/file-0" });
    expect((mockSend.mock.calls[1001][0] as any).input).toEqual({ Bucket: "bucket", Key: "artifacts/app-1/file-1000" });
  });

  test("deleteApplicationArtifacts - succeeds when no objects are found", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [],
      IsTruncated: false,
    });

    const storage = new DagsHubArtifactStorage();
    await storage.deleteApplicationArtifacts("app-1");

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test("deleteApplicationArtifacts - throws when list fails", async () => {
    mockSend.mockRejectedValueOnce(new Error("boom"));

    const storage = new DagsHubArtifactStorage();

    await expect(storage.deleteApplicationArtifacts("app-1")).rejects.toThrow("DagsHub Storage list failed: boom");
  });

  test("deleteApplicationArtifacts - throws when an object delete fails", async () => {
    mockSend
      .mockResolvedValueOnce({
        Contents: [{ Key: "artifacts/app-1/file1" }],
        IsTruncated: false,
      })
      .mockRejectedValueOnce(new Error("AccessDenied"));

    const storage = new DagsHubArtifactStorage();

    await expect(storage.deleteApplicationArtifacts("app-1")).rejects.toThrow(
      "DagsHub Storage delete failed: artifacts/app-1/file1: AccessDenied",
    );
  });
});
