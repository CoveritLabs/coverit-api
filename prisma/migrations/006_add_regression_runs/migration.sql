CREATE TYPE "RegressionRunStatus" AS ENUM ('RUNNING', 'PASSED', 'FAILED');
CREATE TYPE "RegressionScenarioStatus" AS ENUM ('RUNNING', 'PASSED', 'FAILED');
CREATE TYPE "RegressionArtifactKind" AS ENUM ('FAILURE', 'LOG', 'HEALING', 'SUMMARY', 'OTHER');

ALTER TABLE "target_applications"
  ADD COLUMN "api_key_hash" TEXT,
  ADD COLUMN "api_key_preview" TEXT,
  ADD COLUMN "api_key_created_at" TIMESTAMP(3),
  ADD COLUMN "api_key_rotated_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "target_applications_api_key_hash_key" ON "target_applications"("api_key_hash");

CREATE TABLE "regression_runs" (
  "id" UUID NOT NULL,
  "run_id" TEXT NOT NULL,
  "target_application_id" UUID NOT NULL,
  "version_id" UUID,
  "status" "RegressionRunStatus" NOT NULL DEFAULT 'RUNNING',
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "passed_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "warning_count" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "regression_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regression_scenarios" (
  "id" UUID NOT NULL,
  "run_db_id" UUID NOT NULL,
  "scenario_key" TEXT NOT NULL,
  "feature_name" TEXT,
  "scenario_name" TEXT,
  "title" TEXT,
  "file" TEXT,
  "line" INTEGER,
  "status" "RegressionScenarioStatus" NOT NULL DEFAULT 'RUNNING',
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "passed_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "warning_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "regression_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regression_events" (
  "id" TEXT NOT NULL,
  "run_db_id" UUID NOT NULL,
  "scenario_id" UUID,
  "type" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "feature_name" TEXT,
  "scenario_name" TEXT,
  "step_id" TEXT,
  "step_label" TEXT,
  "step_type" TEXT,
  "status" TEXT,
  "log_level" TEXT,
  "has_failure" BOOLEAN NOT NULL DEFAULT false,
  "has_healing" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB NOT NULL,
  "raw" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "regression_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regression_artifacts" (
  "id" UUID NOT NULL,
  "run_db_id" UUID NOT NULL,
  "scenario_id" UUID,
  "kind" "RegressionArtifactKind" NOT NULL,
  "name" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "regression_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "regression_runs_target_application_id_run_id_key" ON "regression_runs"("target_application_id", "run_id");
CREATE INDEX "regression_runs_target_application_id_version_id_created_at_idx" ON "regression_runs"("target_application_id", "version_id", "created_at");
CREATE UNIQUE INDEX "regression_scenarios_run_db_id_scenario_key_key" ON "regression_scenarios"("run_db_id", "scenario_key");
CREATE INDEX "regression_scenarios_run_db_id_status_idx" ON "regression_scenarios"("run_db_id", "status");
CREATE INDEX "regression_events_run_db_id_timestamp_idx" ON "regression_events"("run_db_id", "timestamp");
CREATE INDEX "regression_events_scenario_id_timestamp_idx" ON "regression_events"("scenario_id", "timestamp");
CREATE INDEX "regression_events_run_db_id_type_timestamp_idx" ON "regression_events"("run_db_id", "type", "timestamp");
CREATE INDEX "regression_artifacts_run_db_id_kind_idx" ON "regression_artifacts"("run_db_id", "kind");
CREATE INDEX "regression_artifacts_scenario_id_idx" ON "regression_artifacts"("scenario_id");

ALTER TABLE "regression_runs" ADD CONSTRAINT "regression_runs_target_application_id_fkey" FOREIGN KEY ("target_application_id") REFERENCES "target_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "regression_runs" ADD CONSTRAINT "regression_runs_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "target_application_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "regression_scenarios" ADD CONSTRAINT "regression_scenarios_run_db_id_fkey" FOREIGN KEY ("run_db_id") REFERENCES "regression_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "regression_events" ADD CONSTRAINT "regression_events_run_db_id_fkey" FOREIGN KEY ("run_db_id") REFERENCES "regression_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "regression_events" ADD CONSTRAINT "regression_events_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "regression_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "regression_artifacts" ADD CONSTRAINT "regression_artifacts_run_db_id_fkey" FOREIGN KEY ("run_db_id") REFERENCES "regression_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "regression_artifacts" ADD CONSTRAINT "regression_artifacts_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "regression_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
