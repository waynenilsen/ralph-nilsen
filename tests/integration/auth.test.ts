import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestTenant,
  createTestUser,
  createTestUserTenant,
  createTestSession,
  createTestApiKey,
} from "../helpers/setup";
import { validateApiKey } from "@/server/lib/auth";
import { validateSession } from "@/server/lib/session";

describe("Unified Authentication", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("Session Authentication", () => {
    it("should validate a valid session and return user + tenant context", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, "test-session-auth");
        const { userId, email, username } = await createTestUser(
          client,
          "test-session@test.com",
          "testsessionuser"
        );
        await createTestUserTenant(client, userId, tenantId, "owner");
        const sessionToken = await createTestSession(client, userId, tenantId);

        const result = await validateSession(sessionToken);

        expect(result).not.toBeNull();
        expect(result!.user.id).toBe(userId);
        expect(result!.user.email).toBe(email);
        expect(result!.user.username).toBe(username);
        expect(result!.tenant!.id).toBe(tenantId);
        expect(result!.session.session_token).toBe(sessionToken);
      });
    });

    it("should reject invalid session tokens", async () => {
      // Use a valid UUID format that doesn't exist in the database
      const result = await validateSession("00000000-0000-0000-0000-000000000000");
      expect(result).toBeNull();
    });

    it("should reject expired sessions", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, "test-expired-session");
        const { userId } = await createTestUser(
          client,
          "test-expired@test.com",
          "testexpireduser"
        );
        await createTestUserTenant(client, userId, tenantId, "owner");

        // Create an expired session
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 1);
        const { rows } = await client.query(
          "INSERT INTO sessions (user_id, tenant_id, expires_at) VALUES ($1, $2, $3) RETURNING session_token",
          [userId, tenantId, expiredDate]
        );
        const sessionToken = rows[0].session_token;

        const result = await validateSession(sessionToken);
        expect(result).toBeNull();
      });
    });
  });

  describe("API Key Authentication", () => {
    it("should validate a valid API key with user association and return user + tenant context", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, "test-apikey-auth");
        const { userId, email, username } = await createTestUser(
          client,
          "test-apikey@test.com",
          "testapikeyuser"
        );
        await createTestUserTenant(client, userId, tenantId, "owner");
        const { apiKey } = await createTestApiKey(client, tenantId, userId, "Test Key");

        const result = await validateApiKey(apiKey);

        expect(result).not.toBeNull();
        expect(result!.user).not.toBeNull();
        expect(result!.user!.id).toBe(userId);
        expect(result!.user!.email).toBe(email);
        expect(result!.user!.username).toBe(username);
        expect(result!.tenant.id).toBe(tenantId);
        expect(result!.apiKey.tenant_id).toBe(tenantId);
        expect(result!.apiKey.user_id).toBe(userId);
      });
    });

    it("should validate API key without user association (tenant-only context)", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, "test-apikey-nouser");
        const { apiKey } = await createTestApiKey(client, tenantId, null, "Tenant-only Key");

        const result = await validateApiKey(apiKey);

        expect(result).not.toBeNull();
        expect(result!.user).toBeNull();
        expect(result!.tenant.id).toBe(tenantId);
        expect(result!.apiKey.user_id).toBeNull();
      });
    });

    it("should reject invalid API keys", async () => {
      const result = await validateApiKey("tk_invalid_key_12345");
      expect(result).toBeNull();
    });

    it("should reject inactive API keys", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, "test-inactive-key");
        const { apiKey, keyHash } = await createTestApiKey(client, tenantId, null, "Inactive Key");

        // Deactivate the key (need tenant context for RLS)
        await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);
        await client.query("UPDATE api_keys SET is_active = false WHERE key_hash = $1", [keyHash]);
        await client.query("RESET app.current_tenant_id");

        const result = await validateApiKey(apiKey);
        expect(result).toBeNull();
      });
    });

    it("should reject expired API keys", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, "test-expired-key");
        const { userId } = await createTestUser(
          client,
          "test-expiredkey@test.com",
          "testexpiredkeyuser"
        );
        await createTestUserTenant(client, userId, tenantId, "owner");

        // Create an expired API key
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 1);

        const bcrypt = await import("bcryptjs");
        const apiKey = `tk_expired_${Date.now()}`;
        const keyHash = await bcrypt.hash(apiKey, 4);
        // Set tenant context for RLS policy compliance
        await client.query("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);
        await client.query(
          "INSERT INTO api_keys (tenant_id, user_id, key_hash, name, expires_at) VALUES ($1, $2, $3, $4, $5)",
          [tenantId, userId, keyHash, "Expired Key", expiredDate]
        );
        await client.query("RESET app.current_tenant_id");

        const result = await validateApiKey(apiKey);
        expect(result).toBeNull();
      });
    });
  });

  describe("Unified Context", () => {
    it("both session and API key should provide consistent user context", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, "test-unified-context");
        const { userId } = await createTestUser(
          client,
          "test-unified@test.com",
          "testunifieduser"
        );
        await createTestUserTenant(client, userId, tenantId, "owner");

        // Create both session and API key for the same user
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId, "Unified Key");

        // Validate both
        const sessionResult = await validateSession(sessionToken);
        const apiKeyResult = await validateApiKey(apiKey);

        // Both should provide the same user context
        expect(sessionResult!.user.id).toBe(apiKeyResult!.user!.id);
        expect(sessionResult!.user.email).toBe(apiKeyResult!.user!.email);
        expect(sessionResult!.user.username).toBe(apiKeyResult!.user!.username);

        // Both should provide the same tenant context
        expect(sessionResult!.tenant!.id).toBe(apiKeyResult!.tenant.id);
      });
    });
  });
});
