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
  {
    version: 2,
    name: "threshold-calls",
    sql: `
      CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY, household_id TEXT NOT NULL, step_id TEXT NOT NULL, resource_id TEXT NOT NULL,
        status TEXT NOT NULL, transcript JSONB NOT NULL, outcome JSONB, started_at BIGINT NOT NULL);
      ALTER TABLE claim_requirements ADD COLUMN IF NOT EXISTS event_id TEXT;
    `,
  },
  {
    version: 3,
    name: "threshold-approvals",
    sql: `
      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY, household_id TEXT NOT NULL, step_id TEXT NOT NULL, resource_id TEXT NOT NULL,
        need TEXT NOT NULL, script JSONB NOT NULL, status TEXT NOT NULL, outcome TEXT, transcript JSONB,
        created_at BIGINT NOT NULL, decided_at BIGINT);
    `,
  },
  {
    version: 4,
    name: "threshold-call-approval-link",
    sql: `ALTER TABLE calls ADD COLUMN IF NOT EXISTS approval_id TEXT;`,
  },
];
