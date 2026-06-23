// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { getNeo4jReadSession } from "@lib/neo4j";
import redis from "@lib/redis";
import type {
  GenerateUserGuidesBody,
  GenerateUserGuidesJobResponse,
  GenerateUserGuidesResponse,
  UserGuideState,
  UserGuideStatesResponse,
} from "@models/userGuides";
import { docgenArqConfig, enqueueUserGuidesGeneration } from "@queues/arq/docgenArq";
import { getSessionDetails, getSessions } from "@services/crawlSession.service";
import { BadRequestError, NotFoundError } from "@utils/errors";

const USER_GUIDES_RESULT_TIMEOUT_MS = 30_000;
const USER_GUIDES_RESULT_POLL_MS = 1_000;

type Neo4jRecordLike = {
  get(key: string): unknown;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function getOptionalString(record: Neo4jRecordLike, key: string): string | undefined {
  return toOptionalString(record.get(key));
}

function getPathFromUrl(url?: string): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return url.startsWith("/") ? url : undefined;
  }
}

function getStateLabel(stateHash: string, label?: string, title?: string, url?: string): string {
  return label ?? title ?? url ?? stateHash.slice(0, 12);
}

function mapStateRecord(record: Neo4jRecordLike): UserGuideState | null {
  const stateHash = getOptionalString(record, "stateHash");
  if (!stateHash) return null;

  const label = getOptionalString(record, "label");
  const title = getOptionalString(record, "title");
  const url = getOptionalString(record, "url");

  return {
    stateHash,
    label: getStateLabel(stateHash, label, title, url),
    url,
    path: getPathFromUrl(url),
    title,
  };
}

async function waitForArqResult(jobId: string, timeoutMs = USER_GUIDES_RESULT_TIMEOUT_MS): Promise<GenerateUserGuidesJobResponse> {
  const resultKey = `${docgenArqConfig.resultKeyPrefix}${jobId}`;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await redis.get(resultKey);

    if (result) {
      const parsed = JSON.parse(result);
      return parsed.r ?? parsed;
    }

    await wait(USER_GUIDES_RESULT_POLL_MS);
  }

  throw new Error("User guide generation timed out");
}

async function getLatestSessionIdForVersion(projectId: string, appId: string, versionId: string): Promise<string> {
  const { sessions } = await getSessions(projectId, appId, versionId, { page: 1, pageSize: 1 });
  const latestSessionId = sessions[0]?.id;

  if (!latestSessionId) {
    throw new NotFoundError("No crawl session found for this version");
  }

  return latestSessionId;
}

export async function getUserGuideStates(projectId: string, appId: string, versionId: string, sessionId: string): Promise<UserGuideStatesResponse> {
  await getSessionDetails(projectId, appId, versionId, sessionId);

  const neo4jSession = getNeo4jReadSession();

  try {
    const result = await neo4jSession.executeRead((tx) =>
      tx.run(
        `
        MATCH (s:State {session_id: $sessionId})
        WHERE s.state_hash IS NOT NULL
        WITH s, coalesce(s.name, s.label, s.title, s.url, s.state_hash) AS displayLabel
        RETURN
          s.state_hash AS stateHash,
          coalesce(s.name, s.label) AS label,
          s.url AS url,
          s.title AS title
        ORDER BY toString(s.first_seen) ASC, displayLabel ASC
        `,
        { sessionId },
      ),
    );

    return {
      states: result.records.flatMap((record) => {
        const state = mapStateRecord(record);
        return state ? [state] : [];
      }),
    };
  } finally {
    await neo4jSession.close();
  }
}

export async function getUserGuideStatesForVersion(projectId: string, appId: string, versionId: string): Promise<UserGuideStatesResponse> {
  const sessionId = await getLatestSessionIdForVersion(projectId, appId, versionId);
  return getUserGuideStates(projectId, appId, versionId, sessionId);
}

export async function generateUserGuide(
  projectId: string,
  appId: string,
  versionId: string,
  sessionId: string,
  input: GenerateUserGuidesBody,
): Promise<GenerateUserGuidesResponse> {
  const normalizedStartHash = input.startStateHash.toLowerCase();
  const normalizedEndHash = input.endStateHash.toLowerCase();

  if (normalizedStartHash === normalizedEndHash) {
    throw new BadRequestError("Start and end states must be different");
  }

  const { states } = await getUserGuideStates(projectId, appId, versionId, sessionId);
  const sessionStateHashes = new Set(states.map((state) => state.stateHash.toLowerCase()));

  if (!sessionStateHashes.has(normalizedStartHash) || !sessionStateHashes.has(normalizedEndHash)) {
    throw new BadRequestError("Start and end states must belong to the selected crawl session");
  }

  const payload = {
    session_id: sessionId,
    start_state_hash: normalizedStartHash,
    end_state_hash: normalizedEndHash,
  };

  const jobId = await enqueueUserGuidesGeneration(payload);
  const result = await waitForArqResult(jobId);
  const userGuide = result.userGuide ?? "";

  return {
    message: `User guide generation ${result.status}`,
    userGuide: userGuide || "Guide generation failed",
    error: result.lastError,
  };
}

export async function generateUserGuideForVersion(
  projectId: string,
  appId: string,
  versionId: string,
  input: GenerateUserGuidesBody,
): Promise<GenerateUserGuidesResponse> {
  const sessionId = await getLatestSessionIdForVersion(projectId, appId, versionId);
  return generateUserGuide(projectId, appId, versionId, sessionId, input);
}
