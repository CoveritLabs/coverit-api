DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrawlScheduleType') THEN
    CREATE TYPE "CrawlScheduleType" AS ENUM (
      'UNSPECIFIED',
      'ONCE',
      'CRON'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrawlScheduleMode') THEN
    CREATE TYPE "CrawlScheduleMode" AS ENUM (
      'UNSPECIFIED',
      'LATEST_VERSION',
      'FIXED_VERSION'
    );
  END IF;
END $$;

ALTER TABLE "crawl_sessions"
  ADD COLUMN IF NOT EXISTS "regression_codebase_id" UUID,
  ADD COLUMN IF NOT EXISTS "schedule_id" UUID,
  ADD COLUMN IF NOT EXISTS "codegen_config" JSONB,
  ADD COLUMN IF NOT EXISTS "base_url_snapshot" TEXT;

CREATE TABLE IF NOT EXISTS "crawl_schedules" (
  "id" UUID NOT NULL,
  "target_application_id" UUID NOT NULL,
  "version_id" UUID,
  "regression_codebase_id" UUID,
  "schedule_type" "CrawlScheduleType" NOT NULL,
  "schedule_mode" "CrawlScheduleMode" NOT NULL,
  "cron_expression" TEXT,
  "timezone" TEXT,
  "run_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "catch_up" BOOLEAN NOT NULL DEFAULT false,
  "crawl_config" JSONB NOT NULL,
  "codegen_config" JSONB,
  "next_run_at" TIMESTAMP(3),
  "last_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crawl_schedules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "crawl_sessions"
  ADD CONSTRAINT "crawl_sessions_regression_codebase_id_fkey"
  FOREIGN KEY ("regression_codebase_id")
  REFERENCES "regression_codebases"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crawl_sessions"
  ADD CONSTRAINT "crawl_sessions_schedule_id_fkey"
  FOREIGN KEY ("schedule_id")
  REFERENCES "crawl_schedules"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crawl_schedules"
  ADD CONSTRAINT "crawl_schedules_target_application_id_fkey"
  FOREIGN KEY ("target_application_id")
  REFERENCES "target_applications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crawl_schedules"
  ADD CONSTRAINT "crawl_schedules_version_id_fkey"
  FOREIGN KEY ("version_id")
  REFERENCES "target_application_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crawl_schedules"
  ADD CONSTRAINT "crawl_schedules_regression_codebase_id_fkey"
  FOREIGN KEY ("regression_codebase_id")
  REFERENCES "regression_codebases"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "crawl_schedules_target_application_id_is_active_idx"
  ON "crawl_schedules" ("target_application_id", "is_active");

ALTER TABLE "crawl_schedules" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "test_flows" ADD CONSTRAINT "test_flows_crawl_session_id_fkey" FOREIGN KEY ("crawl_session_id") REFERENCES "crawl_sessions"("crawl_session_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_flows" ADD CONSTRAINT "test_flows_app_version_id_fkey" FOREIGN KEY ("app_version_id") REFERENCES "target_application_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_flow_steps" ADD CONSTRAINT "test_flow_steps_crawl_session_id_fkey" FOREIGN KEY ("crawl_session_id") REFERENCES "crawl_sessions"("crawl_session_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_flow_compositions" ADD CONSTRAINT "test_flow_compositions_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "test_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_flow_compositions" ADD CONSTRAINT "test_flow_compositions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "test_flow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
