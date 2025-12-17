import { Database } from "bun:sqlite";
import { resolve } from "path";
import { env } from "./env";


const resolvedPath = resolve(env.DATABASE_URL);

// Initialize SQLite database connection using Bun's native SQLite
export const db = new Database(resolvedPath, { create: true });

// Enable foreign keys for referential integrity
db.run("PRAGMA foreign_keys = ON");

// Configure WAL mode for better concurrent access
db.run("PRAGMA journal_mode = WAL");

console.log(`SQLite database connected at: ${resolvedPath}`);

export default db;
