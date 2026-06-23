ALTER TYPE "RegressionArtifactKind" ADD VALUE IF NOT EXISTS 'SCREENSHOT';
ALTER TYPE "RegressionArtifactKind" ADD VALUE IF NOT EXISTS 'VIDEO';
ALTER TYPE "RegressionArtifactKind" ADD VALUE IF NOT EXISTS 'TRACE';
ALTER TYPE "RegressionArtifactKind" ADD VALUE IF NOT EXISTS 'EVENTS';

CREATE TYPE "RegressionArtifactUploadStatus" AS ENUM ('UPLOADED', 'FAILED');

ALTER TABLE "regression_artifacts"
  ADD COLUMN "content_type" TEXT,
  ADD COLUMN "size_bytes" BIGINT,
  ADD COLUMN "storage_provider" TEXT,
  ADD COLUMN "storage_uri" TEXT,
  ADD COLUMN "storage_path" TEXT,
  ADD COLUMN "checksum_sha256" TEXT,
  ADD COLUMN "upload_status" "RegressionArtifactUploadStatus",
  ADD COLUMN "upload_error" TEXT,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "regression_artifacts_run_db_id_upload_status_idx" ON "regression_artifacts"("run_db_id", "upload_status");
