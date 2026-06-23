DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TestFlowType') THEN
    CREATE TYPE "TestFlowType" AS ENUM (
      'MANUAL',
      'BUG_REPRODUCTION',
      'COVERAGE'
    );
  END IF;
END $$;

ALTER TABLE "test_flows"
  ADD COLUMN IF NOT EXISTS "transition_refs" TEXT[],
  ADD COLUMN IF NOT EXISTS "test_flow_type" "TestFlowType";

UPDATE "test_flows" tf
SET "transition_refs" = migrated.transition_refs
FROM (
  SELECT
    flow."id",
    COALESCE(
      ARRAY_AGG(
        COALESCE(step."transition"->>'transition_id', step."action_fingerprint")
        ORDER BY composition."step_order"
      ) FILTER (WHERE step."id" IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS transition_refs
  FROM "test_flows" flow
  LEFT JOIN "test_flow_compositions" composition
    ON composition."flow_id" = flow."id"
  LEFT JOIN "test_flow_steps" step
    ON step."id" = composition."step_id"
  GROUP BY flow."id"
) AS migrated
WHERE tf."id" = migrated."id"
  AND tf."transition_refs" IS NULL;

UPDATE "test_flows"
SET
  "transition_refs" = COALESCE("transition_refs", ARRAY[]::TEXT[]),
  "test_flow_type" = COALESCE("test_flow_type", 'COVERAGE'::"TestFlowType"),
  "step_count" = COALESCE(array_length("transition_refs", 1), 0);

ALTER TABLE "test_flows"
  ALTER COLUMN "transition_refs" SET NOT NULL,
  ALTER COLUMN "test_flow_type" SET NOT NULL;

DROP INDEX IF EXISTS "test_flows_app_version_id_target_state_hash_idx";
CREATE INDEX IF NOT EXISTS "test_flows_app_version_id_idx" ON "test_flows"("app_version_id");

ALTER TABLE "test_flows"
  DROP COLUMN IF EXISTS "target_state_hash",
  DROP COLUMN IF EXISTS "checkpoint_url",
  DROP COLUMN IF EXISTS "is_clipped";

DROP TABLE IF EXISTS "test_flow_compositions";
DROP TABLE IF EXISTS "test_flow_steps";
