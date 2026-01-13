/**
 * Integration tests for the organizations tRPC router.
 *
 * Tests verify listing user organizations, creating new organizations,
 * and switching between organizations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestUserWithSession,
  createTestUserWithApiKey,
  createTestTenant,
  createTestUserTenant,
} from "../../helpers";
import {
  createSessionCaller,
  createApiKeyCaller,
  createPublicCaller,
  createTestApiKeyObject,
} from "../../helpers/api";

describe("Organizations Router - List", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should list user organizations with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      // Add user to another organization
      const secondTenantId = await createTestTenant(client, `test-second-org-${Date.now()}`);
      await createTestUserTenant(client, userId, secondTenantId, "member");

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

      expect(result).toHaveLength(2);
      const tenantIds = result.map((o) => o.tenant_id);
      expect(tenantIds).toContain(tenantId);
      expect(tenantIds).toContain(secondTenantId);
    });
  });

  it("should list user organizations with API key auth", async () => {
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

      expect(result.length).toBeGreaterThanOrEqual(1);
      const tenantIds = result.map((o) => o.tenant_id);
      expect(tenantIds).toContain(tenantId);
    });
  });

  it("should return only organizations user belongs to", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      // Create an organization user does NOT belong to
      await createTestTenant(client, `test-other-org-${Date.now()}`);

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

      expect(result).toHaveLength(1);
      expect(result[0].tenant_id).toBe(tenantId);
    });
  });
});

describe("Organizations Router - Create", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should create a new organization with session auth", async () => {
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

      const result = await caller.organizations.create({
        name: "New Organization",
      });

      expect(result.tenant).toBeDefined();
      expect(result.tenant.name).toBe("New Organization");
      expect(result.role).toBe("owner");
    });
  });

  it("should create a new organization with API key auth", async () => {
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

      const result = await caller.organizations.create({
        name: "API Created Org",
      });

      expect(result.tenant).toBeDefined();
      expect(result.tenant.name).toBe("API Created Org");
      expect(result.role).toBe("owner");
    });
  });

  it("should add new organization to user's list", async () => {
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

      // Create new org
      const created = await caller.organizations.create({
        name: "My New Org",
      });

      // Verify it appears in list
      const orgs = await caller.organizations.list();

      expect(orgs.length).toBeGreaterThanOrEqual(2);
      const orgIds = orgs.map((o) => o.tenant_id);
      expect(orgIds).toContain(created.tenant.id);
    });
  });

  it("should generate unique slug for organization", async () => {
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

      const result = await caller.organizations.create({
        name: "My Organization",
      });

      expect(result.tenant.slug).toBeDefined();
      expect(typeof result.tenant.slug).toBe("string");
      expect(result.tenant.slug.length).toBeGreaterThan(0);
    });
  });
});

describe("Organizations Router - Switch", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should switch organization with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      // Add user to second org
      const secondTenantId = await createTestTenant(client, `test-switch-org-${Date.now()}`);
      await createTestUserTenant(client, userId, secondTenantId, "member");

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

      const result = await caller.organizations.switch({
        tenantId: secondTenantId,
      });

      expect(result.tenant).toBeDefined();
      expect(result.tenant.id).toBe(secondTenantId);
    });
  });

  it("should reject switch to non-member organization", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      // Create org that user does NOT belong to
      const otherTenantId = await createTestTenant(client, `test-other-org-${Date.now()}`);

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

      await expect(caller.organizations.switch({ tenantId: otherTenantId })).rejects.toThrow(
        "You do not have access to this organization"
      );
    });
  });

  it("should reject switch with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);

      // Add user to second org
      const secondTenantId = await createTestTenant(client, `test-switch-api-${Date.now()}`);
      await createTestUserTenant(client, userId, secondTenantId, "member");

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

      await expect(caller.organizations.switch({ tenantId: secondTenantId })).rejects.toThrow(
        "Organization switching requires session authentication"
      );
    });
  });

  it("should update session tenant on switch", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      // Add user to second org
      const secondTenantId = await createTestTenant(client, `test-session-switch-${Date.now()}`);
      await createTestUserTenant(client, userId, secondTenantId, "member");

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

      await caller.organizations.switch({ tenantId: secondTenantId });

      // Verify session was updated in database
      const { rows: updatedSessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );
      expect(updatedSessions[0].tenant_id).toBe(secondTenantId);
    });
  });
});

describe("Organizations Router - Get Current", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should get current organization with session auth", async () => {
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

      const result = await caller.organizations.getCurrent();

      expect(result.tenant).toBeDefined();
      expect(result.tenant?.id).toBe(tenantId);
    });
  });

  it("should get current organization with API key auth", async () => {
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

      const result = await caller.organizations.getCurrent();

      expect(result.tenant).toBeDefined();
      expect(result.tenant?.id).toBe(tenantId);
    });
  });
});

describe("Organizations Router - Error Cases", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should require authentication for all endpoints", async () => {
    const caller = createPublicCaller();

    await expect(caller.organizations.list()).rejects.toThrow();
    await expect(caller.organizations.create({ name: "Test" })).rejects.toThrow();
    await expect(
      caller.organizations.switch({ tenantId: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow();
    await expect(caller.organizations.getCurrent()).rejects.toThrow();
  });

  it("should reject switch to non-existent organization", async () => {
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

      await expect(
        caller.organizations.switch({
          tenantId: "00000000-0000-0000-0000-000000000000",
        })
      ).rejects.toThrow();
    });
  });
});
