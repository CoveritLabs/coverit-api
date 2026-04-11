import { workerRedis } from "@lib/redis";
import { cacheDel, cacheKeys, cacheSetString } from "@lib/cache";
import { logger } from "@services/logger.service";
import {
  getCrawlerJobPayload,
  markQueuedSessionRunning,
  isSessionAborted,
  markSessionCompletedIfRunning,
  markSessionFailedIfRunning,
  markSessionFinishedAtIfAborted,
} from "@services/crawlSession.service";
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

async function runCrawler(sessionId: string): Promise<void> {
  const payload = await getCrawlerJobPayload(sessionId);
  const python = resolvePythonCommand();
  const cwd = resolveCrawlerWorkdir();
  const moduleName = resolveCrawlerModule();

  const args: string[] = ["-m", moduleName, "--payload-stdin"];

  await new Promise<void>(async (resolve, reject) => {
    await markQueuedSessionRunning(sessionId);

    const finalizeAbortedIfNeeded = async (): Promise<void> => {
      try {
        await markSessionFinishedAtIfAborted(sessionId);
      } catch (e) {
        logger.error(e);
      }
    };

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(python, args, {
        cwd,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        const updated = await markSessionFailedIfRunning(sessionId, `Failed to spawn crawler process. ${message}`);
        if (!updated) await finalizeAbortedIfNeeded();
      } catch (inner) {
        logger.error(inner);
      }
      return reject(err);
    }

    const { stdin, stdout, stderr: childStderr } = child;
    if (!stdin || !stdout || !childStderr) {
      const message = "Crawler process started without stdio pipes.";
      try {
        const updated = await markSessionFailedIfRunning(sessionId, message);
        if (!updated) await finalizeAbortedIfNeeded();
      } catch (e) {
        logger.error(e);
      }
      return reject(new Error(message));
    }

    const pid = child.pid;
    if (pid === undefined) {
      const message = `Failed to start crawler process for session ${sessionId}`;
      try {
        const updated = await markSessionFailedIfRunning(sessionId, message);
        if (!updated) await finalizeAbortedIfNeeded();
      } catch (e) {
        logger.error(e);
      }
      return reject(new Error(message));
    }

    const pidKey = cacheKeys.crawlSession.pid(sessionId);
    await cacheSetString(pidKey, String(pid), 86400);

    const cleanup = async (): Promise<void> => {
      await cacheDel([pidKey]);
    };

    child.once("exit", () => {
      void cleanup();
    });

    child.once("error", () => {
      void cleanup();
    });

    const abortInterval = setInterval(() => {
      void (async () => {
        try {
          const aborted = await isSessionAborted(sessionId);
          if (!aborted) return;

          try {
            child.kill("SIGTERM");
          } catch {
          }
          setTimeout(() => {
            try {
              child.kill("SIGKILL");
            } catch {
            }
          }, 2000);
        } catch (e) {
          logger.error(e);
        }
      })();
    }, 1000);

    stdin.setDefaultEncoding("utf8");
    stdin.end(JSON.stringify(payload));

    let stderr = "";

    stdout.setEncoding("utf8");
    childStderr.setEncoding("utf8");

    stdout.on("data", (chunk: string) => {
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      for (const line of lines) logger.info(line);
    });

    childStderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > 64_000) stderr = stderr.slice(stderr.length - 64_000);
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      for (const line of lines) logger.error(line);
    });

    child.on("error", (err) => {
      clearInterval(abortInterval);
      void (async () => {
        try {
          const updated = await markSessionFailedIfRunning(sessionId, `Crawler process error. ${err.message}`);
          if (!updated) await finalizeAbortedIfNeeded();
        } catch (inner) {
          logger.error(inner);
        }
      })();
      reject(err);
    });

    child.on("exit", (code) => {
      clearInterval(abortInterval);
      void (async () => {
        if (code === 0) {
          try {
            const updated = await markSessionCompletedIfRunning(sessionId);
            if (!updated) await finalizeAbortedIfNeeded();
          } catch (err) {
            logger.error(err);
          }
          return resolve();
        }

        const message = `Crawler process exited with code ${code}. ${stderr.trim()}`.trim();
        try {
          const updated = await markSessionFailedIfRunning(sessionId, message);
          if (!updated) await finalizeAbortedIfNeeded();
        } catch (err) {
          logger.error(err);
        }
        reject(new Error(message));
      })();
    });
  });
}

new Worker(
  "crawl-tasks",
  async (job) => {
    if (job.name !== "crawl") return;
    await runCrawler(job.data.sessionId);
  },
  { connection: workerRedis },
);

logger.info("[Worker] Crawler worker started and listening for jobs...");