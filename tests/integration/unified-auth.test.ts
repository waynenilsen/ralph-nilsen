/**
 * Unified Authentication Verification Tests
 *
 * Comprehensive tests verifying the unified authentication architecture works
 * correctly - both session cookies and API keys work interchangeably for
 * user endpoints.
 *
 * Related PRD: prds/0003-authentication-procedure-architecture-fix.md
 * Ticket: #31
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestUserWithSession,
  createTestUserWithApiKey,
  createTestTodo,
  createTestTag,
  createTestUser,
  createTestTenant,
  createTestSession,
  createTestApiKey,
  createTestUserTenant,
} from "../helpers";
import {
  createSessionCaller,
  createApiKeyCaller,
  createPublicCaller,
  createTenantOnlyCaller,
  createTestApiKeyObject,
} from "../helpers/api";

/**
 * Authentication Method Parity Tests
 *
 * Verify that both session and API key authentication methods
 * provide identical functionality and responses for user endpoints.
 */
describe("Unified Auth - Authentication Method Parity", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("todos.list endpoint parity", () => {
    it("should return identical response structure with session auth", async () => {
      await withTestClient(async (client) => {
        const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
        await createTestTodo(client, tenantId, { title: "Test Todo 1" });
        await createTestTodo(client, tenantId, { title: "Test Todo 2" });

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const caller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });

        const result = await caller.todos.list({});

        expect(result.data).toHaveLength(2);
        expect(result.pagination).toBeDefined();
        expect(result.pagination.total).toBe(2);
      });
    });

    it("should return identical response structure with API key auth", async () => {
      await withTestClient(async (client) => {
        const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);
        await createTestTodo(client, tenantId, { title: "Test Todo 1" });
        await createTestTodo(client, tenantId, { title: "Test Todo 2" });

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);

        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const caller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        const result = await caller.todos.list({});

        expect(result.data).toHaveLength(2);
        expect(result.pagination).toBeDefined();
        expect(result.pagination.total).toBe(2);
      });
    });

    it("should return same data for same user with different auth methods", async () => {
      await withTestClient(async (client) => {
        // Create user with both session and API key
        const tenantId = await createTestTenant(client);
        const { userId } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        // Create todos
        await createTestTodo(client, tenantId, { title: "Todo A" });
        await createTestTodo(client, tenantId, { title: "Todo B" });

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        // Call with session auth
        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const sessionResult = await sessionCaller.todos.list({});

        // Call with API key auth
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });
        const apiKeyResult = await apiKeyCaller.todos.list({});

        // Verify both return same data
        expect(sessionResult.data.length).toBe(apiKeyResult.data.length);
        expect(sessionResult.pagination.total).toBe(apiKeyResult.pagination.total);

        const sessionTitles = sessionResult.data.map((t) => t.title).sort();
        const apiKeyTitles = apiKeyResult.data.map((t) => t.title).sort();
        expect(sessionTitles).toEqual(apiKeyTitles);
      });
    });
  });

  describe("todos.create endpoint parity", () => {
    it("should create todo identically with session auth", async () => {
      await withTestClient(async (client) => {
        const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const caller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });

        const result = await caller.todos.create({
          title: "Session Created Todo",
          status: "pending",
          priority: "high",
        });

        expect(result.id).toBeDefined();
        expect(result.title).toBe("Session Created Todo");
        expect(result.tenant_id).toBe(tenantId);
      });
    });

    it("should create todo identically with API key auth", async () => {
      await withTestClient(async (client) => {
        const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);

        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const caller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        const result = await caller.todos.create({
          title: "API Key Created Todo",
          status: "pending",
          priority: "high",
        });

        expect(result.id).toBeDefined();
        expect(result.title).toBe("API Key Created Todo");
        expect(result.tenant_id).toBe(tenantId);
      });
    });
  });

  describe("tags router parity", () => {
    it("should list tags with session auth", async () => {
      await withTestClient(async (client) => {
        const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
        await createTestTag(client, tenantId, { name: "Tag1" });
        await createTestTag(client, tenantId, { name: "Tag2" });

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const caller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });

        const result = await caller.tags.list();

        expect(result).toHaveLength(2);
      });
    });

    it("should list tags with API key auth", async () => {
      await withTestClient(async (client) => {
        const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);
        await createTestTag(client, tenantId, { name: "Tag1" });
        await createTestTag(client, tenantId, { name: "Tag2" });

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);

        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const caller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        const result = await caller.tags.list();

        expect(result).toHaveLength(2);
      });
    });

    it("should create tag with both auth methods", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        const { userId } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        // Create with session
        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const sessionTag = await sessionCaller.tags.create({ name: "Session Tag" });
        expect(sessionTag.name).toBe("Session Tag");
        expect(sessionTag.tenant_id).toBe(tenantId);

        // Create with API key
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });
        const apiKeyTag = await apiKeyCaller.tags.create({ name: "API Key Tag" });
        expect(apiKeyTag.name).toBe("API Key Tag");
        expect(apiKeyTag.tenant_id).toBe(tenantId);
      });
    });
  });

  describe("organizations router parity", () => {
    it("should list organizations with session auth", async () => {
      await withTestClient(async (client) => {
        const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const caller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });

        const result = await caller.organizations.list();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it("should list organizations with API key auth", async () => {
      await withTestClient(async (client) => {
        const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);

        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const caller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        const result = await caller.organizations.list();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it("should get current organization with both auth methods", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        const { userId } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        // Session auth
        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const sessionResult = await sessionCaller.organizations.getCurrent();
        expect(sessionResult.tenant?.id).toBe(tenantId);

        // API key auth
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });
        const apiKeyResult = await apiKeyCaller.organizations.getCurrent();
        expect(apiKeyResult.tenant?.id).toBe(tenantId);
      });
    });
  });

  describe("auth.me endpoint parity", () => {
    it("should return user info with session auth", async () => {
      await withTestClient(async (client) => {
        const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const caller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });

        const result = await caller.auth.me();

        expect(result.user).toBeDefined();
        expect(result.user.id).toBe(userId);
        expect(result.tenant).toBeDefined();
        expect(result.tenant?.id).toBe(tenantId);
      });
    });

    it("should return user info with API key auth", async () => {
      await withTestClient(async (client) => {
        const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);

        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const caller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        const result = await caller.auth.me();

        expect(result.user).toBeDefined();
        expect(result.user.id).toBe(userId);
        expect(result.tenant).toBeDefined();
        expect(result.tenant?.id).toBe(tenantId);
      });
    });

    it("should return consistent user info from both auth methods", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        const { userId, email, username } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        // Session auth
        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const sessionResult = await sessionCaller.auth.me();

        // API key auth
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });
        const apiKeyResult = await apiKeyCaller.auth.me();

        // Verify consistent user info
        expect(sessionResult.user.id).toBe(apiKeyResult.user.id);
        expect(sessionResult.user.email).toBe(apiKeyResult.user.email);
        expect(sessionResult.user.username).toBe(apiKeyResult.user.username);
        expect(sessionResult.tenant?.id).toBe(apiKeyResult.tenant?.id);
      });
    });
  });
});

/**
 * Context Verification Tests
 *
 * Verify that the context is correctly populated based on
 * authentication method.
 */
describe("Unified Auth - Context Verification", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("session auth provides ctx.user, ctx.session, ctx.tenant", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      // me endpoint returns user and tenant which proves context is set
      const result = await caller.auth.me();

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(userId);
      expect(result.tenant).toBeDefined();
      expect(result.tenant?.id).toBe(tenantId);
    });
  });

  it("API key auth provides ctx.user, ctx.apiKey, ctx.tenant", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);

      const apiKeyObj = createTestApiKeyObject(tenantId, userId);
      const caller = createApiKeyCaller({
        user: users[0],
        tenant: tenants[0],
        apiKey: apiKeyObj,
        rawKey: apiKey,
      });

      // me endpoint returns user and tenant which proves context is set
      const result = await caller.auth.me();

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(userId);
      expect(result.tenant).toBeDefined();
      expect(result.tenant?.id).toBe(tenantId);
    });
  });

  it("both methods provide consistent user info", async () => {
    await withTestClient(async (client) => {
      const tenantId = await createTestTenant(client);
      const { userId, email, username } = await createTestUser(client);
      await createTestUserTenant(client, userId, tenantId);
      const sessionToken = await createTestSession(client, userId, tenantId);
      const { apiKey } = await createTestApiKey(client, tenantId, userId);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      // Session caller
      const sessionCaller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });
      const sessionMe = await sessionCaller.auth.me();

      // API key caller
      const apiKeyObj = createTestApiKeyObject(tenantId, userId);
      const apiKeyCaller = createApiKeyCaller({
        user: users[0],
        tenant: tenants[0],
        apiKey: apiKeyObj,
        rawKey: apiKey,
      });
      const apiKeyMe = await apiKeyCaller.auth.me();

      // Both should return same user info
      expect(sessionMe.user.id).toBe(apiKeyMe.user.id);
      expect(sessionMe.user.email).toBe(apiKeyMe.user.email);
      expect(sessionMe.user.username).toBe(apiKeyMe.user.username);
    });
  });
});

/**
 * Edge Cases Tests
 *
 * Test edge cases and boundary conditions for unified authentication.
 */
describe("Unified Auth - Edge Cases", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("API key without user association (tenant-only)", () => {
    it("should reject tenant-only API key for userProcedure endpoints", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        // Create API key without user_id
        const { apiKey } = await createTestApiKey(client, tenantId, null, "Tenant Only Key");

        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);

        const apiKeyObj = createTestApiKeyObject(tenantId, null);
        const caller = createTenantOnlyCaller({
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        // Should fail because userProcedure requires user context
        await expect(caller.todos.list({})).rejects.toThrow();
      });
    });
  });

  describe("organization switching", () => {
    it("should only allow organization switch with session auth", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        const tenantId2 = await createTestTenant(client, `test-${Date.now()}-2`);
        const { userId } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        await createTestUserTenant(client, userId, tenantId2);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        // Session auth - should succeed
        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const switchResult = await sessionCaller.organizations.switch({ tenantId: tenantId2 });
        expect(switchResult.tenant).toBeDefined();
        expect(switchResult.tenant.id).toBe(tenantId2);

        // API key auth - should fail
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        await expect(apiKeyCaller.organizations.switch({ tenantId: tenantId2 })).rejects.toThrow(
          "Organization switching requires session authentication"
        );
      });
    });
  });

  describe("signout behavior", () => {
    it("should only allow signout with session auth", async () => {
      await withTestClient(async (client) => {
        const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        // API key auth - signout should fail gracefully
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        await expect(apiKeyCaller.auth.signout()).rejects.toThrow(
          "Signout requires session authentication"
        );

        // Session auth - signout should work
        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const result = await sessionCaller.auth.signout();
        expect(result.success).toBe(true);
      });
    });
  });

  describe("concurrent requests with different auth methods", () => {
    it("should handle concurrent requests from same user with different auth methods", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        const { userId } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        // Create test data
        await createTestTodo(client, tenantId, { title: "Concurrent Test Todo" });

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });

        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        // Execute concurrent requests
        const [sessionResult, apiKeyResult] = await Promise.all([
          sessionCaller.todos.list({}),
          apiKeyCaller.todos.list({}),
        ]);

        // Both should return same data
        expect(sessionResult.data.length).toBe(apiKeyResult.data.length);
        expect(sessionResult.pagination.total).toBe(apiKeyResult.pagination.total);
      });
    });
  });

  describe("authentication requirements", () => {
    it("should require authentication for user endpoints", async () => {
      const publicCaller = createPublicCaller();

      // All user endpoints should require auth
      await expect(publicCaller.todos.list({})).rejects.toThrow();
      await expect(publicCaller.tags.list()).rejects.toThrow();
      await expect(publicCaller.organizations.list()).rejects.toThrow();
      await expect(publicCaller.auth.me()).rejects.toThrow();
    });
  });
});

/**
 * Architecture Verification Tests
 *
 * Verify the authentication architecture matches the PRD 0003 specification.
 */
describe("Unified Auth - Architecture Verification", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("user endpoints use userProcedure", () => {
    it("todos router works with both auth methods", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        const { userId } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        // Test all todos router endpoints
        // list
        await expect(sessionCaller.todos.list({})).resolves.toBeDefined();
        await expect(apiKeyCaller.todos.list({})).resolves.toBeDefined();

        // create
        const sessionTodo = await sessionCaller.todos.create({
          title: "Session Test",
          status: "pending",
          priority: "medium",
        });
        const apiKeyTodo = await apiKeyCaller.todos.create({
          title: "API Key Test",
          status: "pending",
          priority: "medium",
        });

        // get
        await expect(sessionCaller.todos.get({ id: sessionTodo.id })).resolves.toBeDefined();
        await expect(apiKeyCaller.todos.get({ id: apiKeyTodo.id })).resolves.toBeDefined();

        // update
        await expect(
          sessionCaller.todos.update({ id: sessionTodo.id, data: { title: "Updated" } })
        ).resolves.toBeDefined();
        await expect(
          apiKeyCaller.todos.update({ id: apiKeyTodo.id, data: { title: "Updated" } })
        ).resolves.toBeDefined();

        // delete
        await expect(sessionCaller.todos.delete({ id: sessionTodo.id })).resolves.toEqual({
          success: true,
        });
        await expect(apiKeyCaller.todos.delete({ id: apiKeyTodo.id })).resolves.toEqual({
          success: true,
        });
      });
    });

    it("tags router works with both auth methods", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        const { userId } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        // Test all tags router endpoints
        // list
        await expect(sessionCaller.tags.list()).resolves.toBeDefined();
        await expect(apiKeyCaller.tags.list()).resolves.toBeDefined();

        // create
        const sessionTag = await sessionCaller.tags.create({ name: "Session Tag" });
        const apiKeyTag = await apiKeyCaller.tags.create({ name: "API Key Tag" });

        // get
        await expect(sessionCaller.tags.get({ id: sessionTag.id })).resolves.toBeDefined();
        await expect(apiKeyCaller.tags.get({ id: apiKeyTag.id })).resolves.toBeDefined();

        // update
        await expect(
          sessionCaller.tags.update({ id: sessionTag.id, data: { name: "Updated Session Tag" } })
        ).resolves.toBeDefined();
        await expect(
          apiKeyCaller.tags.update({ id: apiKeyTag.id, data: { name: "Updated API Key Tag" } })
        ).resolves.toBeDefined();

        // delete
        await expect(sessionCaller.tags.delete({ id: sessionTag.id })).resolves.toEqual({
          success: true,
        });
        await expect(apiKeyCaller.tags.delete({ id: apiKeyTag.id })).resolves.toEqual({
          success: true,
        });
      });
    });

    it("organizations router works with both auth methods", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        const { userId } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        // list
        await expect(sessionCaller.organizations.list()).resolves.toBeDefined();
        await expect(apiKeyCaller.organizations.list()).resolves.toBeDefined();

        // getCurrent
        await expect(sessionCaller.organizations.getCurrent()).resolves.toBeDefined();
        await expect(apiKeyCaller.organizations.getCurrent()).resolves.toBeDefined();

        // create (works with both)
        await expect(
          sessionCaller.organizations.create({ name: "Session Org" })
        ).resolves.toBeDefined();
        await expect(
          apiKeyCaller.organizations.create({ name: "API Key Org" })
        ).resolves.toBeDefined();
      });
    });

    it("auth.me and auth.signout work with userProcedure", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client);
        const { userId } = await createTestUser(client);
        await createTestUserTenant(client, userId, tenantId);
        const sessionToken = await createTestSession(client, userId, tenantId);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        // auth.me works with both
        await expect(sessionCaller.auth.me()).resolves.toBeDefined();
        await expect(apiKeyCaller.auth.me()).resolves.toBeDefined();

        // auth.signout only works with session (but handles API key gracefully)
        await expect(apiKeyCaller.auth.signout()).rejects.toThrow();
        await expect(sessionCaller.auth.signout()).resolves.toEqual({ success: true });
      });
    });
  });

  describe("admin endpoints use adminProcedure", () => {
    it("tenants router requires admin auth", async () => {
      await withTestClient(async (client) => {
        const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
        const { apiKey } = await createTestApiKey(client, tenantId, userId);

        const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
        const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          tenantId,
        ]);
        const { rows: sessions } = await client.query(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken]
        );

        const sessionCaller = createSessionCaller({
          user: users[0],
          tenant: tenants[0],
          session: sessions[0],
        });
        const apiKeyObj = createTestApiKeyObject(tenantId, userId);
        const apiKeyCaller = createApiKeyCaller({
          user: users[0],
          tenant: tenants[0],
          apiKey: apiKeyObj,
          rawKey: apiKey,
        });

        // Tenant endpoints should reject regular users
        await expect(sessionCaller.tenants.list()).rejects.toThrow();
        await expect(apiKeyCaller.tenants.list()).rejects.toThrow();
      });
    });
  });

  describe("public endpoints work without auth", () => {
    it("auth.signup and auth.signin are public", async () => {
      const publicCaller = createPublicCaller();

      // signup should work (but will fail if email exists)
      const email = `test-${Date.now()}@test.com`;
      const username = `testuser${Date.now()}`;
      const password = "StrongPassword123!";
      const result = await publicCaller.auth.signup({
        email,
        username,
        password,
        confirmPassword: password,
      });

      expect(result.user).toBeDefined();
      expect(result.sessionToken).toBeDefined();

      // signin should work
      const signinResult = await publicCaller.auth.signin({
        identifier: email,
        password,
      });

      expect(signinResult.user).toBeDefined();
      expect(signinResult.sessionToken).toBeDefined();
    });

    it("auth.requestPasswordReset is public", async () => {
      const publicCaller = createPublicCaller();

      // Should work even for non-existent email (returns success to prevent enumeration)
      const result = await publicCaller.auth.requestPasswordReset({
        email: "nonexistent@test.com",
      });

      expect(result.success).toBe(true);
    });
  });
});
