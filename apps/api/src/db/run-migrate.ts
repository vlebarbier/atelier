import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSqlite } from './client.js';
import { ensureLegacyTables } from './legacy.js';
import { migrateWithDrizzle } from './migrate.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(dir, '..', '..');
const DB_PATH = process.env.API_DB_PATH || path.join(apiRoot, 'data', 'atelier.db');

const sqlite = openSqlite(DB_PATH);
ensureLegacyTables(sqlite);
migrateWithDrizzle(sqlite);
console.log(`Migrations Drizzle appliquees sur ${DB_PATH}`);
sqlite.close();
