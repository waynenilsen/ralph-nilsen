import { Pool } from "pg";
import bcrypt from "bcryptjs";

const DATABASE_URL =
  process.env.DATABASE_URL_ADMIN || "postgresql://todo_user:todo_pass@localhost:40001/todo_db";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Starting database seed...");

    const { rows: tenantRows } = await client.query(`
      INSERT INTO tenants (name, slug)
      VALUES ('Demo Company', 'demo')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const tenantId = tenantRows[0].id;
    console.log("Created demo tenant:", tenantId);

    const apiKey = "tk_demo_key_for_testing_12345";
    const keyHash = await bcrypt.hash(apiKey, BCRYPT_ROUNDS);

    await client.query(
      `
      INSERT INTO api_keys (tenant_id, key_hash, name)
      VALUES ($1, $2, 'Demo API Key')
      ON CONFLICT DO NOTHING
    `,
      [tenantId, keyHash]
    );
    console.log("Created demo API key:", apiKey);

    const tagData = [
      { name: "Work", color: "#ef4444" },
      { name: "Personal", color: "#3b82f6" },
      { name: "Urgent", color: "#f97316" },
    ];

    for (const t of tagData) {
      await client.query(
        `
        INSERT INTO tags (tenant_id, name, color)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, name) DO UPDATE SET color = EXCLUDED.color
      `,
        [tenantId, t.name, t.color]
      );
    }
    console.log("Created tags");

    const todos = [
      { title: "Complete project proposal", priority: "high", status: "pending" },
      { title: "Review code changes", priority: "medium", status: "pending" },
      { title: "Team standup meeting", priority: "medium", status: "completed" },
    ];

    for (const t of todos) {
      await client.query(
        `
        INSERT INTO todos (tenant_id, title, priority, status)
        VALUES ($1, $2, $3, $4)
      `,
        [tenantId, t.title, t.priority, t.status]
      );
    }
    console.log("Created sample todos");

    console.log("\n=== Seed completed! ===");
    console.log("API Key:", apiKey);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
