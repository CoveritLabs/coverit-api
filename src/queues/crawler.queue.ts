import redis from "@lib/redis";
import { Queue } from "bullmq";

export type CrawlJobPayload = {
  base_url: string;
  session_id?: string;
  max_states?: number;
  max_transitions?: number;
  headless?: boolean;
  config_path?: string;
};

export const crawlerQueue = new Queue("crawler", {
  connection: redis,
});

export async function enqueueCrawlJob(payload: CrawlJobPayload): Promise<string> {
  const job = await crawlerQueue.add("crawl", payload);
  return String(job.id);
}
