import { Pool } from "pg";
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const DATABASE_URL =
  process.env.DATABASE_URL_ADMIN || "postgresql://todo_user:todo_pass@localhost:40001/todo_db";
const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Starting database migration...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const { rows: executed } = await client.query("SELECT name FROM _migrations ORDER BY id");
    const executedNames = new Set(executed.map((r) => r.name));

    const migrationsDir = join(__dirname, "migrations");
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

    for (const file of sqlFiles) {
      if (executedNames.has(file)) {
        console.log(`Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`Executing ${file}...`);
      const content = await readFile(join(migrationsDir, file), "utf-8");

      await client.query("BEGIN");
      try {
        await client.query(content);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Completed ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
