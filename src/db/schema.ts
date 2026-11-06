import { getDbExec } from "@agent-native/core/db";
import { resources } from "../data/resources.seed";

export async function initDb() {
  const db = getDbExec();
  await db.execute(`DROP TABLE IF EXISTS events;`);
  await db.execute(`DROP TABLE IF EXISTS steps;`);
  await db.execute(`DROP TABLE IF EXISTS claim_requirements;`);
  await db.execute(`DROP TABLE IF EXISTS needs;`);
  await db.execute(`DROP TABLE IF EXISTS households;`);
  await db.execute(`DROP TABLE IF EXISTS resources;`);

  await db.execute(`
    CREATE TABLE households (
      id TEXT PRIMARY KEY,
      children TEXT NOT NULL,
      location TEXT NOT NULL,
      language TEXT NOT NULL,
      secondary_language TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE needs (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      need TEXT NOT NULL,
      priority INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE resources (
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
    CREATE TABLE steps (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      need TEXT NOT NULL,
      status TEXT NOT NULL,
      resource_id TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE events (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE claim_requirements (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      requirement TEXT NOT NULL,
      verified INTEGER NOT NULL
    );
  `);

  for (const r of resources) {
    const accepts = r.acceptsChildren === null ? null : r.acceptsChildren ? 1 : 0;
    const open = r.openNow === null ? null : r.openNow ? 1 : 0;
    const agesJson = r.agesServed ? JSON.stringify(r.agesServed) : null;
    const dist = r.distanceKm !== null ? r.distanceKm : null;
    const phone = r.phone !== null ? r.phone : null;
    const address = r.address !== null ? r.address : null;
    const verified = r.verifiedAt !== null ? r.verifiedAt : null;
    const conflict = r.conflictNote !== null ? r.conflictNote : null;

    await db.execute(`
      INSERT INTO resources (id, name, kind, distance_km, accepts_children, ages_served, hours, open_now, phone, address, source_url, verified_at, conflict_note)
      VALUES (
        '${r.id.replace(/'/g, "''")}',
        '${r.name.replace(/'/g, "''")}',
        '${r.kind.replace(/'/g, "''")}',
        ${dist},
        ${accepts},
        ${agesJson ? `'${agesJson.replace(/'/g, "''")}'` : 'NULL'},
        ${r.hours ? `'${r.hours.replace(/'/g, "''")}'` : 'NULL'},
        ${open},
        ${phone ? `'${phone.replace(/'/g, "''")}'` : 'NULL'},
        ${address ? `'${address.replace(/'/g, "''")}'` : 'NULL'},
        '${r.sourceUrl.replace(/'/g, "''")}',
        ${verified ? `'${verified.replace(/'/g, "''")}'` : 'NULL'},
        ${conflict ? `'${conflict.replace(/'/g, "''")}'` : 'NULL'}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        kind = EXCLUDED.kind,
        distance_km = EXCLUDED.distance_km,
        accepts_children = EXCLUDED.accepts_children,
        ages_served = EXCLUDED.ages_served,
        hours = EXCLUDED.hours,
        open_now = EXCLUDED.open_now,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        source_url = EXCLUDED.source_url,
        verified_at = EXCLUDED.verified_at,
        conflict_note = EXCLUDED.conflict_note;
    `);
  }
}
