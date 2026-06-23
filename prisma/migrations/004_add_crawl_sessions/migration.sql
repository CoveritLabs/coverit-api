DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrawlStatus') THEN
    CREATE TYPE "CrawlStatus" AS ENUM (
      'UNSPECIFIED',
      'QUEUED',
      'RUNNING',
      'COMPLETED',
      'FAILED',
      'ABORTED',
      'PAUSED',
      'NEW'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrawlTriggerType') THEN
    CREATE TYPE "CrawlTriggerType" AS ENUM (
      'UNSPECIFIED',
      'MANUAL',
      'SCHEDULED',
      'CI_TRIGGER',
      'WEBHOOK'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "crawl_sessions" (
  "crawl_session_id" UUID NOT NULL,
  "app_version_id" UUID NOT NULL,
  "status" "CrawlStatus" NOT NULL DEFAULT 'NEW',
  "trigger_type" "CrawlTriggerType" NOT NULL,
  "config" JSONB NOT NULL,
  "state_count" INTEGER NOT NULL DEFAULT 0,
  "transition_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "crawl_sessions_pkey" PRIMARY KEY ("crawl_session_id")
);

ALTER TABLE "crawl_sessions"
  ADD CONSTRAINT "crawl_sessions_app_version_id_fkey"
  FOREIGN KEY ("app_version_id")
  REFERENCES "target_application_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
