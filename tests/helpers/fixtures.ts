/**
 * Test data fixtures.
 *
 * Provides factory functions for creating test data with sensible defaults.
 * All fixtures use test-* prefixes for easy cleanup.
 */

import { PoolClient } from "pg";
import {
  createTestTenant,
  createTestUser,
  createTestUserTenant,
  createTestSession,
  createTestApiKey,
  setTenantContext,
  resetTenantContext,
} from "./setup";

// Re-export base fixtures
export {
  createTestTenant,
  createTestUser,
  createTestUserTenant,
  createTestSession,
  createTestApiKey,
};

// Default test password (used in createTestUser)
export const TEST_PASSWORD = "testpassword123";

/**
 * Create a complete test user with tenant and session.
 * Returns everything needed to authenticate as this user.
 */
export async function createTestUserWithSession(
  client: PoolClient,
  options: {
    email?: string;
    username?: string;
    tenantSlug?: string;
    role?: string;
  } = {}
): Promise<{
  userId: string;
  email: string;
  username: string;
  tenantId: string;
  sessionToken: string;
}> {
  const timestamp = Date.now();
  const { email, username } = await createTestUser(
    client,
    options.email || `test-${timestamp}@test.com`,
    options.username || `testuser${timestamp}`
  );
  const userId = (await client.query("SELECT id FROM users WHERE email = $1", [email])).rows[0].id;

  const tenantId = await createTestTenant(client, options.tenantSlug || `test-${timestamp}`);

  await createTestUserTenant(client, userId, tenantId, options.role || "owner");

  const sessionToken = await createTestSession(client, userId, tenantId);

  return { userId, email, username, tenantId, sessionToken };
}

/**
 * Create a complete test user with tenant and API key.
 * Returns everything needed to authenticate via API key.
 */
export async function createTestUserWithApiKey(
  client: PoolClient,
  options: {
    email?: string;
    username?: string;
    tenantSlug?: string;
    role?: string;
    apiKeyName?: string;
  } = {}
): Promise<{
  userId: string;
  email: string;
  username: string;
  tenantId: string;
  apiKey: string;
}> {
  const timestamp = Date.now();
  const { email, username } = await createTestUser(
    client,
    options.email || `test-${timestamp}@test.com`,
    options.username || `testuser${timestamp}`
  );
  const userId = (await client.query("SELECT id FROM users WHERE email = $1", [email])).rows[0].id;

  const tenantId = await createTestTenant(client, options.tenantSlug || `test-${timestamp}`);

  await createTestUserTenant(client, userId, tenantId, options.role || "owner");

  const { apiKey } = await createTestApiKey(
    client,
    tenantId,
    userId,
    options.apiKeyName || "Test API Key"
  );

  return { userId, email, username, tenantId, apiKey };
}

/**
 * Create a test todo for a tenant.
 */
export async function createTestTodo(
  client: PoolClient,
  tenantId: string,
  options: {
    title?: string;
    description?: string;
    status?: "pending" | "completed";
    priority?: "low" | "medium" | "high";
    dueDate?: Date;
  } = {}
): Promise<string> {
  await setTenantContext(client, tenantId);
  try {
    const { rows } = await client.query(
      `INSERT INTO todos (tenant_id, title, description, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        tenantId,
        options.title || `Test Todo ${Date.now()}`,
        options.description || null,
        options.status || "pending",
        options.priority || "medium",
        options.dueDate || null,
      ]
    );
    return rows[0].id;
  } finally {
    await resetTenantContext(client);
  }
}

/**
 * Create multiple test todos at once.
 * Useful for testing pagination and filtering.
 */
export async function createTestTodos(
  client: PoolClient,
  tenantId: string,
  count: number,
  options: {
    titlePrefix?: string;
    status?: "pending" | "completed";
    priority?: "low" | "medium" | "high";
  } = {}
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = await createTestTodo(client, tenantId, {
      title: `${options.titlePrefix || "Test Todo"} ${i + 1}`,
      status: options.status,
      priority: options.priority,
    });
    ids.push(id);
  }
  return ids;
}

/**
 * Create a test tag for a tenant.
 */
export async function createTestTag(
  client: PoolClient,
  tenantId: string,
  options: {
    name?: string;
    color?: string;
  } = {}
): Promise<string> {
  await setTenantContext(client, tenantId);
  try {
    const { rows } = await client.query(
      `INSERT INTO tags (tenant_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [tenantId, options.name || `Test Tag ${Date.now()}`, options.color || "#000000"]
    );
    return rows[0].id;
  } finally {
    await resetTenantContext(client);
  }
}

/**
 * Add a tag to a todo.
 */
export async function addTagToTodo(
  client: PoolClient,
  tenantId: string,
  todoId: string,
  tagId: string
): Promise<void> {
  await setTenantContext(client, tenantId);
  try {
    await client.query(
      `INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)
       ON CONFLICT (todo_id, tag_id) DO NOTHING`,
      [todoId, tagId]
    );
  } finally {
    await resetTenantContext(client);
  }
}

/**
 * Create a test todo with tags.
 */
export async function createTestTodoWithTags(
  client: PoolClient,
  tenantId: string,
  options: {
    title?: string;
    description?: string;
    status?: "pending" | "completed";
    priority?: "low" | "medium" | "high";
    tagNames?: string[];
  } = {}
): Promise<{ todoId: string; tagIds: string[] }> {
  const todoId = await createTestTodo(client, tenantId, options);
  const tagIds: string[] = [];

  for (const tagName of options.tagNames || []) {
    const tagId = await createTestTag(client, tenantId, { name: tagName });
    await addTagToTodo(client, tenantId, todoId, tagId);
    tagIds.push(tagId);
  }

  return { todoId, tagIds };
}

/**
 * Create a password reset token for testing.
 */
export async function createTestPasswordResetToken(
  client: PoolClient,
  userId: string,
  options: {
    expiresAt?: Date;
    used?: boolean;
  } = {}
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = options.expiresAt || new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const usedAt = options.used ? new Date() : null;

  await client.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at, used_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, expiresAt, usedAt]
  );

  return token;
}

/**
 * Create an expired password reset token for testing error cases.
 */
export async function createExpiredPasswordResetToken(
  client: PoolClient,
  userId: string
): Promise<string> {
  return createTestPasswordResetToken(client, userId, {
    expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
  });
}

/**
 * Seed a complete test environment with multiple tenants, users, and data.
 * Useful for integration tests that need a realistic dataset.
 */
export async function seedTestEnvironment(client: PoolClient): Promise<{
  tenants: { id: string; slug: string }[];
  users: { id: string; email: string; tenantId: string }[];
}> {
  const tenants: { id: string; slug: string }[] = [];
  const users: { id: string; email: string; tenantId: string }[] = [];

  // Create 2 test tenants
  for (let i = 1; i <= 2; i++) {
    const slug = `test-seed-${Date.now()}-${i}`;
    const tenantId = await createTestTenant(client, slug);
    tenants.push({ id: tenantId, slug });

    // Create user for each tenant
    const result = await createTestUserWithSession(client, {
      email: `test-seed-${Date.now()}-${i}@test.com`,
      tenantSlug: slug,
    });
    users.push({ id: result.userId, email: result.email, tenantId });

    // Create some todos for each tenant
    await createTestTodos(client, tenantId, 3, {
      titlePrefix: `Tenant ${i} Todo`,
    });

    // Create tags for each tenant
    await createTestTag(client, tenantId, { name: `Tenant ${i} Tag`, color: "#ff0000" });
  }

  return { tenants, users };
}

/**
 * Generate a unique test email.
 */
export function generateTestEmail(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
}

/**
 * Generate a unique test username.
 * Username must be 3-30 characters, alphanumeric with _ and -.
 */
export function generateTestUsername(prefix: string = "tu"): string {
  // Use shorter timestamp (last 8 digits) + short random to stay under 30 chars
  const ts = Date.now().toString().slice(-8);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}${ts}${rand}`;
}

/**
 * Generate a unique test slug.
 */
export function generateTestSlug(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
