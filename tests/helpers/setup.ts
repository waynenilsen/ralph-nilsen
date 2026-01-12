import { Pool, PoolClient } from "pg";
import bcrypt from "bcryptjs";

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
  await client.query("DELETE FROM sessions");
  await client.query("DELETE FROM password_reset_tokens");
  await client.query("DELETE FROM api_keys");
  await client.query("DELETE FROM user_tenants");
  // Clean up all test users (email ending in @test.com or starting with test-)
  await client.query("DELETE FROM users WHERE email LIKE 'test-%' OR email LIKE '%@test.com'");
  await client.query("DELETE FROM tenants WHERE slug LIKE 'test-%'");
}

export async function createTestTenant(client: PoolClient, slug: string = `test-${Date.now()}`): Promise<string> {
  const { rows } = await client.query(
    "INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id",
    [`Test Tenant ${slug}`, slug]
  );
  return rows[0].id;
}

export async function createTestUser(
  client: PoolClient,
  email: string = `test-${Date.now()}@test.com`,
  username: string = `testuser${Date.now()}`
): Promise<{ userId: string; email: string; username: string }> {
  const passwordHash = await bcrypt.hash("testpassword123", 4);
  const { rows } = await client.query(
    "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username",
    [email, username, passwordHash]
  );
  return { userId: rows[0].id, email: rows[0].email, username: rows[0].username };
}

export async function createTestUserTenant(
  client: PoolClient,
  userId: string,
  tenantId: string,
  role: string = "member"
): Promise<void> {
  await client.query(
    "INSERT INTO user_tenants (user_id, tenant_id, role) VALUES ($1, $2, $3)",
    [userId, tenantId, role]
  );
}

export async function createTestSession(
  client: PoolClient,
  userId: string,
  tenantId: string | null = null
): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const { rows } = await client.query(
    "INSERT INTO sessions (user_id, tenant_id, expires_at) VALUES ($1, $2, $3) RETURNING session_token",
    [userId, tenantId, expiresAt]
  );
  return rows[0].session_token;
}

export async function createTestApiKey(
  client: PoolClient,
  tenantId: string,
  userId: string | null = null,
  name: string = "Test API Key"
): Promise<{ apiKey: string; keyHash: string }> {
  const apiKey = `tk_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const keyHash = await bcrypt.hash(apiKey, 4);
  // Set tenant context for RLS policy compliance
  await setTenantContext(client, tenantId);
  await client.query(
    "INSERT INTO api_keys (tenant_id, user_id, key_hash, name) VALUES ($1, $2, $3, $4)",
    [tenantId, userId, keyHash, name]
  );
  await resetTenantContext(client);
  return { apiKey, keyHash };
}

export async function setTenantContext(client: PoolClient, tenantId: string): Promise<void> {
  await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);
}

export async function resetTenantContext(client: PoolClient): Promise<void> {
  await client.query("RESET app.current_tenant_id");
}
