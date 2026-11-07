import type { MigrationEntry } from "@agent-native/core/db";

export const migrations: MigrationEntry[] = [
  {
    version: 1,
    name: "threshold-case-record",
    sql: `
        CREATE TABLE IF NOT EXISTS households (
          id TEXT PRIMARY KEY, children JSONB NOT NULL, location TEXT NOT NULL,
          language TEXT NOT NULL, created_at BIGINT NOT NULL);
        CREATE TABLE IF NOT EXISTS needs (
          id TEXT PRIMARY KEY, household_id TEXT NOT NULL, need TEXT NOT NULL, priority INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS steps (
          id TEXT PRIMARY KEY, household_id TEXT NOT NULL, need TEXT NOT NULL,
          status TEXT NOT NULL, resource_id TEXT);
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY, household_id TEXT NOT NULL, timestamp BIGINT NOT NULL,
          type TEXT NOT NULL, description TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS claim_requirements (
          id TEXT PRIMARY KEY, household_id TEXT NOT NULL, requirement TEXT NOT NULL, verified BOOLEAN NOT NULL);
      `,
  },
];
