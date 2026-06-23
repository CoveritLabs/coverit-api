DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ScenarioIntegrationReportStatus'
  ) THEN
    CREATE TYPE "ScenarioIntegrationReportStatus" AS ENUM (
      'PENDING',
      'CREATING',
      'ATTACHING',
      'CREATED',
      'FAILED'
    );
  END IF;
END $$;

ALTER TABLE "project_integrations"
  ADD COLUMN IF NOT EXISTS "reporting_config" JSONB;

CREATE TABLE IF NOT EXISTS "scenario_integration_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "run_db_id" UUID NOT NULL,
  "scenario_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "ScenarioIntegrationReportStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "reporter_user_id" UUID NOT NULL,
  "reporter_email" TEXT NOT NULL,
  "artifact_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "attached_artifact_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "external_issue_key" TEXT,
  "external_issue_url" TEXT,
  "provider_data" JSONB,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scenario_integration_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "scenario_integration_reports_scenario_id_provider_key"
  ON "scenario_integration_reports"("scenario_id", "provider");

CREATE INDEX IF NOT EXISTS "scenario_integration_reports_project_id_provider_status_idx"
  ON "scenario_integration_reports"("project_id", "provider", "status");

CREATE INDEX IF NOT EXISTS "scenario_integration_reports_run_db_id_idx"
  ON "scenario_integration_reports"("run_db_id");

CREATE INDEX IF NOT EXISTS "scenario_integration_reports_status_updated_at_idx"
  ON "scenario_integration_reports"("status", "updated_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scenario_integration_reports_project_id_fkey'
  ) THEN
    ALTER TABLE "scenario_integration_reports"
      ADD CONSTRAINT "scenario_integration_reports_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scenario_integration_reports_run_db_id_fkey'
  ) THEN
    ALTER TABLE "scenario_integration_reports"
      ADD CONSTRAINT "scenario_integration_reports_run_db_id_fkey"
      FOREIGN KEY ("run_db_id") REFERENCES "regression_runs"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scenario_integration_reports_scenario_id_fkey'
  ) THEN
    ALTER TABLE "scenario_integration_reports"
      ADD CONSTRAINT "scenario_integration_reports_scenario_id_fkey"
      FOREIGN KEY ("scenario_id") REFERENCES "regression_scenarios"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;