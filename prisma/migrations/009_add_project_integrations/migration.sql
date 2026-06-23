CREATE TABLE "project_integrations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "jira_cloud_id" TEXT NOT NULL,
  "jira_site_name" TEXT,
  "jira_site_url" TEXT,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "token_type" TEXT NOT NULL,
  "encrypted_access_token" TEXT NOT NULL,
  "encrypted_refresh_token" TEXT,
  "access_token_expires_at" TIMESTAMP(3),
  "authorized_by_user_id" UUID,
  "refreshed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_integrations_project_id_provider_key"
  ON "project_integrations"("project_id", "provider");

CREATE INDEX "project_integrations_provider_idx"
  ON "project_integrations"("provider");

ALTER TABLE "project_integrations"
  ADD CONSTRAINT "project_integrations_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
