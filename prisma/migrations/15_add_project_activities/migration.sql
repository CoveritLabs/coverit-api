CREATE TABLE "project_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "actor_name" TEXT,
  "actor_email" TEXT,
  "event_type" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "project_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_activities_project_id_created_at_idx"
  ON "project_activities"("project_id", "created_at");

CREATE INDEX "project_activities_project_id_event_type_created_at_idx"
  ON "project_activities"("project_id", "event_type", "created_at");

ALTER TABLE "project_activities"
  ADD CONSTRAINT "project_activities_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_activities"
  ADD CONSTRAINT "project_activities_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
