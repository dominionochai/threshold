import { getDbExec } from "@agent-native/core/db";
import { resources } from "../data/resources.seed";

const TABLES = [
  `CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY, children TEXT NOT NULL, location TEXT NOT NULL,
    language TEXT NOT NULL, secondary_language TEXT)`,
  `CREATE TABLE IF NOT EXISTS needs (
    id TEXT PRIMARY KEY, household_id TEXT NOT NULL, need TEXT NOT NULL, priority INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, distance_km REAL,
    accepts_children BOOLEAN, ages_served TEXT, hours TEXT, open_now BOOLEAN, phone TEXT,
    address TEXT, source_url TEXT NOT NULL, verified_at TEXT, conflict_note TEXT)`,
  `CREATE TABLE IF NOT EXISTS steps (
    id TEXT PRIMARY KEY, household_id TEXT NOT NULL, need TEXT NOT NULL,
    status TEXT NOT NULL, resource_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, household_id TEXT NOT NULL, timestamp BIGINT NOT NULL,
    type TEXT NOT NULL, description TEXT NOT NULL, metadata TEXT)`,
  `CREATE TABLE IF NOT EXISTS claim_requirements (
    id TEXT PRIMARY KEY, household_id TEXT NOT NULL, requirement TEXT NOT NULL, verified BOOLEAN NOT NULL)`,
];

const UPSERT_RESOURCE = `INSERT INTO resources
  (id, name, kind, distance_km, accepts_children, ages_served, hours, open_now, phone, address, source_url, verified_at, conflict_note)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
  ON CONFLICT (id) DO UPDATE SET name=$2, kind=$3, distance_km=$4, accepts_children=$5, ages_served=$6,
    hours=$7, open_now=$8, phone=$9, address=$10, source_url=$11, verified_at=$12, conflict_note=$13`;

export async function initDb() {
  const db = getDbExec();
  for (const sql of TABLES) await db.execute(sql);
  for (const r of resources) {
    await db.execute({
      sql: UPSERT_RESOURCE,
      args: [r.id, r.name, r.kind, r.distanceKm, r.acceptsChildren, r.agesServed && JSON.stringify(r.agesServed),
        r.hours, r.openNow, r.phone, r.address, r.sourceUrl, r.verifiedAt, r.conflictNote ?? null],
    });
  }
}
