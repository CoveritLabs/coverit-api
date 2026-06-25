ALTER TABLE "test_flows"
  ADD COLUMN IF NOT EXISTS "editor_steps" JSONB NOT NULL DEFAULT '[]'::jsonb;
