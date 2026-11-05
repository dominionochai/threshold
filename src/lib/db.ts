import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { resources as resourcesSeed } from "../data/resources.seed";
import type { CaseRecord, Resource } from "../engine/types";

export type HandoffStatus = "prepared" | "rejected";

export interface HandoffRecord {
  id: string;
  caseId: string;
  status: HandoffStatus;
  message: string;
}

const configuredPath = process.env.DB_PATH ?? ".data/threshold.sqlite";
const databasePath = isAbsolute(configuredPath)
  ? configuredPath
  : resolve(process.cwd(), configuredPath);

mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS handoffs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('prepared', 'rejected')),
    data TEXT NOT NULL
  );
`);

// Seed once per resource ID. Existing records are left intact on later starts.
const seedResources = db.transaction((records: Resource[]) => {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO resources (id, data) VALUES (?, ?)",
  );
  for (const resource of records) {
    insert.run(resource.id, JSON.stringify(resource));
  }
});
seedResources(resourcesSeed);

const insertCaseStatement = db.prepare(
  "INSERT INTO cases (id, data) VALUES (?, ?)",
);
const getCaseStatement = db.prepare("SELECT data FROM cases WHERE id = ?");
const listCasesStatement = db.prepare("SELECT data FROM cases ORDER BY rowid");

/** Persist a complete case, including its Household fields, evidence, and simulated flag. */
export function insertCase(record: CaseRecord): CaseRecord {
  insertCaseStatement.run(record.id, JSON.stringify(record));
  return record;
}

export function getCase(id: string): CaseRecord | undefined {
  const row = getCaseStatement.get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as CaseRecord) : undefined;
}

export function listCases(): CaseRecord[] {
  const rows = listCasesStatement.all() as { data: string }[];
  return rows.map(({ data }) => JSON.parse(data) as CaseRecord);
}

export function listResources(): Resource[] {
  const rows = db
    .prepare("SELECT data FROM resources ORDER BY rowid")
    .all() as { data: string }[];
  return rows.map(({ data }) => JSON.parse(data) as Resource);
}

const insertHandoffStatement = db.prepare(
  "INSERT INTO handoffs (id, status, data) VALUES (?, ?, ?)",
);
const getHandoffStatement = db.prepare(
  "SELECT data FROM handoffs WHERE id = ?",
);
const updateHandoffStatement = db.prepare(
  "UPDATE handoffs SET status = ?, data = ? WHERE id = ?",
);

function assertHandoffStatus(status: string): asserts status is HandoffStatus {
  if (status !== "prepared" && status !== "rejected") {
    throw new TypeError(`Unsupported handoff status: ${status}`);
  }
}

function getHandoffRecord(id: string): HandoffRecord | undefined {
  const row = getHandoffStatement.get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as HandoffRecord) : undefined;
}

/** Handoff records deliberately have no delivered/sent state. */
export function insertHandoff(record: HandoffRecord): HandoffRecord {
  assertHandoffStatus(record.status);
  insertHandoffStatement.run(
    record.id,
    record.status,
    JSON.stringify(record),
  );
  return record;
}

/** Update only the handoff status and/or message; return undefined if it does not exist. */
export function updateHandoff(
  id: string,
  updates: Partial<Pick<HandoffRecord, "status" | "message">>,
): HandoffRecord | undefined {
  const current = getHandoffRecord(id);
  if (!current) return undefined;
  if (updates.status !== undefined) assertHandoffStatus(updates.status);

  const updated: HandoffRecord = {
    ...current,
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.message !== undefined ? { message: updates.message } : {}),
  };
  updateHandoffStatement.run(
    updated.status,
    JSON.stringify(updated),
    updated.id,
  );
  return updated;
}
