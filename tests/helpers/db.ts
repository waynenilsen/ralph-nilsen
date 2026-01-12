/**
 * Database test utilities.
 *
 * Enhanced database helpers for testing that extend the base setup utilities.
 * Provides transaction isolation, RLS context management, and query helpers.
 */

import { PoolClient } from "pg";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  setTenantContext,
  resetTenantContext,
} from "./setup";

export {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  setTenantContext,
  resetTenantContext,
};

/**
 * Execute callback within a transaction that will be rolled back.
 * Perfect for test isolation - changes are never persisted.
 */
export async function withRollbackTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getTestPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("ROLLBACK");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute callback within a transaction with tenant context that will be rolled back.
 */
export async function withTenantRollbackTransaction<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withRollbackTransaction(async (client) => {
    await setTenantContext(client, tenantId);
    try {
      return await callback(client);
    } finally {
      await resetTenantContext(client);
    }
  });
}

/**
 * Execute callback within tenant context (non-rollback).
 * Changes will be persisted. Use cleanupTestData for cleanup.
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withTestClient(async (client) => {
    await setTenantContext(client, tenantId);
    try {
      return await callback(client);
    } finally {
      await resetTenantContext(client);
    }
  });
}

/**
 * Execute callback within a persisted transaction with tenant context.
 * Use when you need transactional guarantees with committed results.
 */
export async function withTenantTransaction<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getTestPool();
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
 * Check if the test database is reachable.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const pool = getTestPool();
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the count of records in a table (respects RLS if tenant context is set).
 */
export async function getTableCount(
  client: PoolClient,
  tableName: string
): Promise<number> {
  const { rows } = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
  return parseInt(rows[0].count, 10);
}

/**
 * Verify a record exists in a table by ID.
 */
export async function recordExists(
  client: PoolClient,
  tableName: string,
  id: string
): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM ${tableName} WHERE id = $1`,
    [id]
  );
  return rows.length > 0;
}

/**
 * Delete a specific record by ID (useful for targeted cleanup).
 */
export async function deleteRecord(
  client: PoolClient,
  tableName: string,
  id: string
): Promise<void> {
  await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
}

/**
 * Truncate tables for fast cleanup (bypasses RLS).
 * Use with caution - clears all data in the specified tables.
 */
export async function truncateTables(
  client: PoolClient,
  tableNames: string[]
): Promise<void> {
  await client.query(`TRUNCATE ${tableNames.join(", ")} CASCADE`);
}

/**
 * Wait for a condition to be true with timeout.
 * Useful for testing async operations.
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
