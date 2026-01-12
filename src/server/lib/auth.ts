import bcrypt from "bcryptjs";
import { adminPool } from "@/server/db";
import type { ApiKey, Tenant, User } from "@/shared/types";

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "admin-secret-key-change-in-production";

export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, BCRYPT_ROUNDS);
}

export async function compareApiKey(apiKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "tk_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validates an API key and returns user, tenant, and API key context.
 * API keys are associated with both users and tenants, providing the same
 * context as session-based authentication.
 */
export async function validateApiKey(
  apiKey: string
): Promise<{ user: User | null; tenant: Tenant; apiKey: ApiKey } | null> {
  const client = await adminPool.connect();
  try {
    const { rows: keys } = await client.query(`
      SELECT
        ak.id, ak.tenant_id, ak.user_id, ak.key_hash, ak.name, ak.last_used_at,
        ak.created_at, ak.expires_at, ak.is_active,
        t.name as tenant_name, t.slug as tenant_slug, t.is_active as tenant_is_active,
        t.created_at as tenant_created_at, t.updated_at as tenant_updated_at,
        u.id as user_db_id, u.email as user_email, u.username as user_username,
        u.password_hash as user_password_hash, u.email_verified as user_email_verified,
        u.created_at as user_created_at, u.updated_at as user_updated_at
      FROM api_keys ak
      JOIN tenants t ON t.id = ak.tenant_id
      LEFT JOIN users u ON u.id = ak.user_id
      WHERE ak.is_active = true
      AND t.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
    `);

    for (const key of keys) {
      const matches = await compareApiKey(apiKey, key.key_hash);
      if (matches) {
        await client.query("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", [key.id]);

        const tenant: Tenant = {
          id: key.tenant_id,
          name: key.tenant_name,
          slug: key.tenant_slug,
          is_active: key.tenant_is_active,
          created_at: key.tenant_created_at,
          updated_at: key.tenant_updated_at,
        };

        const apiKeyRecord: ApiKey = {
          id: key.id,
          tenant_id: key.tenant_id,
          user_id: key.user_id,
          key_hash: key.key_hash,
          name: key.name,
          last_used_at: key.last_used_at,
          created_at: key.created_at,
          expires_at: key.expires_at,
          is_active: key.is_active,
        };

        // Build user object if user_id is associated
        const user: User | null = key.user_db_id
          ? {
              id: key.user_db_id,
              email: key.user_email,
              username: key.user_username,
              password_hash: key.user_password_hash,
              email_verified: key.user_email_verified,
              created_at: key.user_created_at,
              updated_at: key.user_updated_at,
            }
          : null;

        return { user, tenant, apiKey: apiKeyRecord };
      }
    }

    return null;
  } finally {
    client.release();
  }
}

export function validateAdminApiKey(apiKey: string): boolean {
  return apiKey === ADMIN_API_KEY;
}

/**
 * Creates an API key for a tenant, optionally associated with a user.
 * API keys with user association provide user context when validated.
 */
export async function createApiKeyForTenant(
  tenantId: string,
  name?: string,
  expiresAt?: Date,
  userId?: string
): Promise<{ apiKey: string; record: ApiKey }> {
  const apiKey = generateApiKey();
  const keyHash = await hashApiKey(apiKey);

  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<ApiKey>(
      `INSERT INTO api_keys (tenant_id, user_id, key_hash, name, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, userId || null, keyHash, name || null, expiresAt || null]
    );
    return { apiKey, record: rows[0]! };
  } finally {
    client.release();
  }
}
