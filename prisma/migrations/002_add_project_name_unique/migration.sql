-- Add unique constraint on project name
-- Ensure no duplicate names exist before applying this in production.
-- Add a unique index/constraint to enforce unique project names.

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'projects_name_key'
    ) THEN
        CREATE UNIQUE INDEX "projects_name_key" ON "projects"("name");
    END IF;
END $$;
