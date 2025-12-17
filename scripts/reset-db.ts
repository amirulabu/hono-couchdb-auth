import { config } from "dotenv";
import { resolve } from "path";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

// Load environment variables
config();

// Get DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL is not set in environment variables");
  process.exit(1);
}

// Parse the database path
// Handle both file paths (e.g., "./auth.db") and sqlite:// URLs
let dbPath: string;
if (databaseUrl.startsWith("sqlite://")) {
  // Extract path from sqlite:// URL (e.g., "sqlite://./auth.db" -> "./auth.db")
  dbPath = databaseUrl.replace("sqlite://", "");
} else {
  dbPath = databaseUrl;
}

// Resolve to absolute path
const resolvedPath = resolve(dbPath);

// Generate paths for related SQLite files
const dbFile = resolvedPath;
const shmFile = `${resolvedPath}-shm`;
const walFile = `${resolvedPath}-wal`;

// Function to delete a file if it exists
async function deleteFileIfExists(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    try {
      await unlink(filePath);
      console.log(`Deleted: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting ${filePath}:`, error);
      throw error;
    }
  } else {
    console.log(`File does not exist, skipping: ${filePath}`);
  }
}

// Delete all SQLite files
async function resetDatabase(): Promise<void> {
  console.log(`Resetting database at: ${resolvedPath}`);
  
  try {
    await deleteFileIfExists(dbFile);
    await deleteFileIfExists(shmFile);
    await deleteFileIfExists(walFile);
    console.log("Database reset completed successfully");
  } catch (error) {
    console.error("Failed to reset database:", error);
    process.exit(1);
  }
}

// Run the reset
resetDatabase();

