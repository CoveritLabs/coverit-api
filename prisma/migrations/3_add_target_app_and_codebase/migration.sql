-- Create TargetApplication and related tables

-- CreateTable: target_applications
CREATE TABLE IF NOT EXISTS "target_applications" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: target_application_versions
CREATE TABLE IF NOT EXISTS "target_application_versions" (
    "id" UUID NOT NULL,
    "target_application_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_application_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: regression_codebases
CREATE TABLE IF NOT EXISTS "regression_codebases" (
    "id" UUID NOT NULL,
    "target_application_id" UUID NOT NULL,
    "framework_name" TEXT NOT NULL,
    "repository_url" TEXT NOT NULL,
    "api_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regression_codebases_pkey" PRIMARY KEY ("id")
);

-- Indexes / Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "target_applications_project_id_name_key" ON "target_applications"("project_id", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "target_application_versions_target_application_id_version_key" ON "target_application_versions"("target_application_id", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "regression_codebases_target_application_id_repository_url_key" ON "regression_codebases"("target_application_id", "repository_url");

-- Foreign keys
ALTER TABLE "target_applications" ADD CONSTRAINT "target_applications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "target_application_versions" ADD CONSTRAINT "target_application_versions_target_application_id_fkey" FOREIGN KEY ("target_application_id") REFERENCES "target_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "regression_codebases" ADD CONSTRAINT "regression_codebases_target_application_id_fkey" FOREIGN KEY ("target_application_id") REFERENCES "target_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
