-- CreateTable if not exists
CREATE TABLE IF NOT EXISTS "test_flows" (
    "id" UUID NOT NULL,
    "crawl_session_id" UUID NOT NULL,
    "app_version_id" UUID NOT NULL,
    "target_state_hash" TEXT NOT NULL,
    "checkpoint_state_hash" TEXT NOT NULL,
    "checkpoint_url" TEXT NOT NULL,
    "is_clipped" BOOLEAN NOT NULL,
    "step_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "test_flow_steps" (
    "id" UUID NOT NULL,
    "crawl_session_id" UUID NOT NULL,
    "source_state_hash" TEXT NOT NULL,
    "target_state_hash" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_fingerprint" TEXT NOT NULL,
    "transition" JSONB NOT NULL,

    CONSTRAINT "test_flow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "test_flow_compositions" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,

    CONSTRAINT "test_flow_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex if not exists
CREATE INDEX "test_flows_crawl_session_id_idx" ON "test_flows"("crawl_session_id");

-- CreateIndex
CREATE INDEX "test_flows_app_version_id_target_state_hash_idx" ON "test_flows"("app_version_id", "target_state_hash");

-- CreateIndex
CREATE UNIQUE INDEX "test_flow_steps_crawl_session_id_action_fingerprint_key" ON "test_flow_steps"("crawl_session_id", "action_fingerprint");

-- CreateIndex
CREATE INDEX "test_flow_compositions_flow_id_idx" ON "test_flow_compositions"("flow_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_flow_compositions_flow_id_step_order_key" ON "test_flow_compositions"("flow_id", "step_order");
