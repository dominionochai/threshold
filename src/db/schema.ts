import { getDbExec } from "@agent-native/core/db";

export async function initDb() {
  const db = getDbExec();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      children TEXT NOT NULL,
      location TEXT NOT NULL,
      language TEXT NOT NULL,
      secondary_language TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS needs (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      need TEXT NOT NULL,
      priority INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      distance_km REAL,
      accepts_children INTEGER,
      ages_served TEXT,
      hours TEXT,
      open_now INTEGER,
      phone TEXT,
      address TEXT,
      source_url TEXT NOT NULL,
      verified_at TEXT,
      conflict_note TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      need TEXT NOT NULL,
      status TEXT NOT NULL,
      resource_id TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS claim_requirements (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      requirement TEXT NOT NULL,
      verified INTEGER NOT NULL
    );
  `);
}
