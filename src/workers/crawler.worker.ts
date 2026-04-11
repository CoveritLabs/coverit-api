import { workerRedis } from "@lib/redis";
import { logger } from "@services/logger.service";
import type { CrawlJobPayload } from "@queues/crawler.queue";
import { Worker } from "bullmq";
import { spawn } from "node:child_process";
import path from "node:path";

function resolveCrawlerWorkdir(): string {
  const configured = process.env.CRAWLER_WORKDIR;
  if (configured && configured.trim()) return configured;
  return path.resolve(process.cwd(), "../coverit-crawler");
}

function resolvePythonCommand(): string {
  return process.env.CRAWLER_PYTHON?.trim() || "python";
}

function resolveCrawlerModule(): string {
  return process.env.CRAWLER_MODULE?.trim() || "src.workers.crawler_worker";
}

function buildArgs(payload: CrawlJobPayload): string[] {
  const moduleName = resolveCrawlerModule();
  const args: string[] = ["-m", moduleName, "--base-url", payload.base_url];

  if (payload.session_id) args.push("--session-id", payload.session_id);
  if (typeof payload.max_states === "number") args.push("--max-states", String(payload.max_states));
  if (typeof payload.max_transitions === "number") args.push("--max-transitions", String(payload.max_transitions));
  if (typeof payload.headless === "boolean") args.push(payload.headless ? "--headless" : "--no-headless");
  if (payload.config_path) args.push("--config-path", payload.config_path);

  return args;
}

async function runCrawler(payload: CrawlJobPayload): Promise<void> {
  const python = resolvePythonCommand();
  const args = buildArgs(payload);
  const cwd = resolveCrawlerWorkdir();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(python, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      for (const line of lines) logger.info(line);
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > 64_000) stderr = stderr.slice(stderr.length - 64_000);
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      for (const line of lines) logger.error(line);
    });

    child.on("error", (err) => reject(err));

    child.on("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`Crawler process exited with code ${code}. ${stderr.trim()}`));
    });
  });
}

new Worker(
  "crawler",
  async (job) => {
    if (job.name !== "crawl") return;
    const payload = job.data as CrawlJobPayload;
    if (!payload?.base_url) throw new Error("base_url is required");
    await runCrawler(payload);
  },
  { connection: workerRedis },
);

logger.info("[Worker] Crawler worker started and listening for jobs...");
