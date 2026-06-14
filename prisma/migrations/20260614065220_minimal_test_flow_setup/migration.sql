/*
  Warnings:

  - You are about to drop the column `checkpoint_url` on the `test_flows` table. All the data in the column will be lost.
  - You are about to drop the column `is_clipped` on the `test_flows` table. All the data in the column will be lost.
  - You are about to drop the `test_flow_compositions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `test_flow_steps` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "test_flow_compositions" DROP CONSTRAINT "test_flow_compositions_flow_id_fkey";

-- DropForeignKey
ALTER TABLE "test_flow_compositions" DROP CONSTRAINT "test_flow_compositions_step_id_fkey";

-- DropForeignKey
ALTER TABLE "test_flow_steps" DROP CONSTRAINT "test_flow_steps_crawl_session_id_fkey";

-- AlterTable
ALTER TABLE "test_flows" DROP COLUMN "checkpoint_url",
DROP COLUMN "is_clipped",
ADD COLUMN     "transition_refs" TEXT[];

-- DropTable
DROP TABLE "test_flow_compositions";

-- DropTable
DROP TABLE "test_flow_steps";
