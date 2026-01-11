import { Pool, PoolClient } from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://app_user:app_pass@localhost:40001/todo_db";

let pool: Pool | null = null;

export function getTestPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function withTestClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const p = getTestPool();
  const client = await p.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function cleanupTestData(client: PoolClient): Promise<void> {
  await client.query("DELETE FROM todo_tags");
  await client.query("DELETE FROM tags");
  await client.query("DELETE FROM todos");
  await client.query("DELETE FROM api_keys");
  await client.query("DELETE FROM tenants WHERE slug LIKE 'test-%'");
}

export async function createTestTenant(client: PoolClient, slug: string = `test-${Date.now()}`): Promise<string> {
  const { rows } = await client.query(
    "INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id",
    [`Test Tenant ${slug}`, slug]
  );
  return rows[0].id;
}

export async function setTenantContext(client: PoolClient, tenantId: string): Promise<void> {
  await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);
}

export async function resetTenantContext(client: PoolClient): Promise<void> {
  await client.query("RESET app.current_tenant_id");
}
