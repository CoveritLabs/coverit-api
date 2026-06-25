// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import neo4j, { type Driver, type Session } from "neo4j-driver";

import { env } from "@config/env";

const neo4jUri = env.NEO4J_URI ?? "bolt://localhost:7687";
const neo4jUser = env.NEO4J_USER ?? "neo4j";
const neo4jPassword = env.NEO4J_PASSWORD ?? "";

const driver: Driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword), {
  maxConnectionPoolSize: 20,
});

export function getNeo4jReadSession(): Session {
  return driver.session({ defaultAccessMode: neo4j.session.READ });
}

export async function verifyNeo4jConnection(): Promise<void> {
  const session = driver.session();
  try {
    await session.run("RETURN 1");
  } finally {
    await session.close();
  }
}

export async function closeNeo4jConnection(): Promise<void> {
  await driver.close();
}

export default driver;
