import { Pool, PoolClient } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://app_user:app_pass@localhost:40001/todo_db";
const DATABASE_URL_ADMIN = process.env.DATABASE_URL_ADMIN || "postgresql://todo_user:todo_pass@localhost:40001/todo_db";

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const adminPool = new Pool({
  connectionString: DATABASE_URL_ADMIN,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

adminPool.on("error", (err) => {
  console.error("Unexpected admin database pool error:", err);
});

/**
 * Tagged template for SQL queries with the pool.
 */
export async function query<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const text = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ""), "");
  const result = await pool.query(text, values);
  return result.rows as T[];
}

/**
 * Execute queries with tenant context.
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);
    return await callback(client);
  } finally {
    await client.query("RESET app.current_tenant_id").catch(() => {});
    client.release();
  }
}

/**
 * Execute a transaction with tenant context.
 */
export async function withTenantTransaction<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.query("RESET app.current_tenant_id").catch(() => {});
    client.release();
  }
}

/**
 * Health check for database connection.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch {
    return false;
  }
}
