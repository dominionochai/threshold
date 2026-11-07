import { runMigrations } from "@agent-native/core/db";
import { migrations } from "../db/migrations.js";

export default runMigrations(migrations, { table: "threshold_migrations" });
