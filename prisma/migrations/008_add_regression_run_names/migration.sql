ALTER TABLE "regression_runs"
  ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Run',
  ADD COLUMN "name_number" INTEGER NOT NULL DEFAULT 1;

WITH numbered AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "target_application_id", "name"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS sequence_number
  FROM "regression_runs"
)
UPDATE "regression_runs" AS runs
SET "name_number" = numbered.sequence_number
FROM numbered
WHERE runs."id" = numbered."id";

CREATE UNIQUE INDEX "regression_runs_target_application_id_name_name_number_key"
  ON "regression_runs"("target_application_id", "name", "name_number");
