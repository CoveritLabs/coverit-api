ALTER TABLE "crawl_schedules"
ADD COLUMN IF NOT EXISTS "creator_user_id" UUID;

ALTER TABLE "crawl_sessions"
ADD COLUMN IF NOT EXISTS "creator_user_id" UUID;

WITH fallback_user AS (
  SELECT "id"
  FROM "users"
  ORDER BY "created_at" ASC
  LIMIT 1
)
UPDATE "crawl_schedules"
SET "creator_user_id" = (SELECT "id" FROM fallback_user)
WHERE "creator_user_id" IS NULL;

WITH fallback_user AS (
  SELECT "id"
  FROM "users"
  ORDER BY "created_at" ASC
  LIMIT 1
)
UPDATE "crawl_sessions"
SET "creator_user_id" = COALESCE(
  (
    SELECT "crawl_schedules"."creator_user_id"
    FROM "crawl_schedules"
    WHERE "crawl_schedules"."id" = "crawl_sessions"."schedule_id"
  ),
  (SELECT "id" FROM fallback_user)
)
WHERE "creator_user_id" IS NULL;

ALTER TABLE "crawl_schedules"
ALTER COLUMN "creator_user_id" SET NOT NULL;

ALTER TABLE "crawl_sessions"
ALTER COLUMN "creator_user_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'crawl_schedules_creator_user_id_fkey'
  ) THEN
    ALTER TABLE "crawl_schedules"
    ADD CONSTRAINT "crawl_schedules_creator_user_id_fkey"
    FOREIGN KEY ("creator_user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'crawl_sessions_creator_user_id_fkey'
  ) THEN
    ALTER TABLE "crawl_sessions"
    ADD CONSTRAINT "crawl_sessions_creator_user_id_fkey"
    FOREIGN KEY ("creator_user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
