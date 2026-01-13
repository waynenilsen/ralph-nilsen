/**
 * Integration tests for the tenants tRPC router.
 *
 * Tests verify admin-only CRUD operations on tenants, tenant stats,
 * and access control for non-admin users.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestTenant,
  createTestUserWithSession,
  createTestTodos,
  createTestTag,
  createTestApiKey,
  generateTestSlug,
} from "../../helpers";
import { createAdminCaller, createSessionCaller, createPublicCaller } from "../../helpers/api";

describe("Tenants Router - Admin List", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should list all tenants with admin auth", async () => {
    await withTestClient(async (client) => {
      await createTestTenant(client, `test-admin-list-1-${Date.now()}`);
      await createTestTenant(client, `test-admin-list-2-${Date.now()}`);
      await createTestTenant(client, `test-admin-list-3-${Date.now()}`);

      const caller = createAdminCaller();
      const result = await caller.tenants.list();

      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("should return tenants sorted by created_at descending", async () => {
    await withTestClient(async (client) => {
      // Create tenants with slight delay to ensure order
      await createTestTenant(client, `test-sort-first-${Date.now()}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createTestTenant(client, `test-sort-second-${Date.now()}`);

      const caller = createAdminCaller();
      const result = await caller.tenants.list();

      // Most recent should be first
      for (let i = 1; i < result.length; i++) {
        const prev = new Date(result[i - 1].created_at).getTime();
        const curr = new Date(result[i].created_at).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });
});

describe("Tenants Router - Admin Get", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should get a single tenant with admin auth", async () => {
    await withTestClient(async (client) => {
      const slug = `test-admin-get-${Date.now()}`;
      const tenantId = await createTestTenant(client, slug);

      const caller = createAdminCaller();
      const result = await caller.tenants.get({ id: tenantId });

      expect(result.id).toBe(tenantId);
      expect(result.slug).toBe(slug);
    });
  });

  it("should return NOT_FOUND for non-existent tenant", async () => {
    const caller = createAdminCaller();

    await expect(
      caller.tenants.get({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow("Tenant not found");
  });
});

describe("Tenants Router - Admin Create", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should create a tenant with admin auth", async () => {
    const caller = createAdminCaller();
    const slug = generateTestSlug("test-admin-create");

    const result = await caller.tenants.create({
      name: "Admin Created Tenant",
      slug,
    });

    expect(result.tenant).toBeDefined();
    expect(result.tenant.name).toBe("Admin Created Tenant");
    expect(result.tenant.slug).toBe(slug);
    expect(result.apiKey).toBeDefined();
    expect(result.apiKey.startsWith("tk_")).toBe(true);
  });

  it("should create initial API key for new tenant", async () => {
    const caller = createAdminCaller();
    const slug = generateTestSlug("test-apikey-create");

    const result = await caller.tenants.create({
      name: "Tenant with API Key",
      slug,
    });

    expect(result.apiKey).toBeDefined();
    expect(typeof result.apiKey).toBe("string");
    expect(result.apiKey.length).toBeGreaterThan(10);
  });

  it("should reject duplicate slug", async () => {
    await withTestClient(async (client) => {
      const slug = `test-dup-slug-${Date.now()}`;
      await createTestTenant(client, slug);

      const caller = createAdminCaller();

      await expect(caller.tenants.create({ name: "Duplicate Slug", slug })).rejects.toThrow(
        "A tenant with this slug already exists"
      );
    });
  });
});

describe("Tenants Router - Admin Update", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should update tenant name with admin auth", async () => {
    await withTestClient(async (client) => {
      const tenantId = await createTestTenant(client, `test-update-name-${Date.now()}`);

      const caller = createAdminCaller();
      const result = await caller.tenants.update({
        id: tenantId,
        data: { name: "Updated Tenant Name" },
      });

      expect(result.name).toBe("Updated Tenant Name");
    });
  });

  it("should update tenant is_active status", async () => {
    await withTestClient(async (client) => {
      const tenantId = await createTestTenant(client, `test-update-active-${Date.now()}`);

      const caller = createAdminCaller();

      // Deactivate
      const deactivated = await caller.tenants.update({
        id: tenantId,
        data: { is_active: false },
      });
      expect(deactivated.is_active).toBe(false);

      // Reactivate
      const reactivated = await caller.tenants.update({
        id: tenantId,
        data: { is_active: true },
      });
      expect(reactivated.is_active).toBe(true);
    });
  });

  it("should reject update with no fields", async () => {
    await withTestClient(async (client) => {
      const tenantId = await createTestTenant(client, `test-update-empty-${Date.now()}`);

      const caller = createAdminCaller();

      await expect(caller.tenants.update({ id: tenantId, data: {} })).rejects.toThrow(
        "No fields to update"
      );
    });
  });

  it("should return NOT_FOUND for non-existent tenant", async () => {
    const caller = createAdminCaller();

    await expect(
      caller.tenants.update({
        id: "00000000-0000-0000-0000-000000000000",
        data: { name: "Updated" },
      })
    ).rejects.toThrow("Tenant not found");
  });
});

describe("Tenants Router - Admin Delete", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should delete a tenant with admin auth", async () => {
    await withTestClient(async (client) => {
      const tenantId = await createTestTenant(client, `test-delete-${Date.now()}`);

      const caller = createAdminCaller();
      const result = await caller.tenants.delete({ id: tenantId });

      expect(result.success).toBe(true);

      // Verify tenant is gone
      await expect(caller.tenants.get({ id: tenantId })).rejects.toThrow("Tenant not found");
    });
  });

  it("should return NOT_FOUND for non-existent tenant", async () => {
    const caller = createAdminCaller();

    await expect(
      caller.tenants.delete({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow("Tenant not found");
  });
});

describe("Tenants Router - Admin Stats", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should get tenant stats with admin auth", async () => {
    await withTestClient(async (client) => {
      const tenantId = await createTestTenant(client, `test-stats-${Date.now()}`);

      // Create some todos
      await createTestTodos(client, tenantId, 5, { status: "pending" });
      await createTestTodos(client, tenantId, 3, { status: "completed" });

      // Create some tags
      await createTestTag(client, tenantId, { name: "Tag1" });
      await createTestTag(client, tenantId, { name: "Tag2" });

      // Create an API key
      await createTestApiKey(client, tenantId);

      const caller = createAdminCaller();
      const result = await caller.tenants.stats({ id: tenantId });

      expect(result.todos.total).toBe(8);
      expect(result.todos.pending).toBe(5);
      expect(result.todos.completed).toBe(3);
      expect(result.tags).toBe(2);
      expect(result.activeApiKeys).toBe(1);
    });
  });

  it("should return zero stats for empty tenant", async () => {
    await withTestClient(async (client) => {
      const tenantId = await createTestTenant(client, `test-empty-stats-${Date.now()}`);

      const caller = createAdminCaller();
      const result = await caller.tenants.stats({ id: tenantId });

      expect(result.todos.total).toBe(0);
      expect(result.todos.pending).toBe(0);
      expect(result.todos.completed).toBe(0);
      expect(result.tags).toBe(0);
      expect(result.activeApiKeys).toBe(0);
    });
  });

  it("should return NOT_FOUND for non-existent tenant", async () => {
    const caller = createAdminCaller();

    await expect(
      caller.tenants.stats({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow("Tenant not found");
  });
});

describe("Tenants Router - Admin Create API Key", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should create API key for tenant with admin auth", async () => {
    await withTestClient(async (client) => {
      const tenantId = await createTestTenant(client, `test-create-key-${Date.now()}`);

      const caller = createAdminCaller();
      const result = await caller.tenants.createApiKey({
        tenantId,
        name: "New API Key",
      });

      expect(result.apiKey).toBeDefined();
      expect(result.apiKey.startsWith("tk_")).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.record.name).toBe("New API Key");
      expect(result.record.tenant_id).toBe(tenantId);
    });
  });

  it("should create API key with expiration", async () => {
    await withTestClient(async (client) => {
      const tenantId = await createTestTenant(client, `test-key-expire-${Date.now()}`);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const caller = createAdminCaller();
      const result = await caller.tenants.createApiKey({
        tenantId,
        name: "Expiring Key",
        expiresAt: expiresAt.toISOString(),
      });

      expect(result.record.expires_at).toBeDefined();
    });
  });

  it("should return NOT_FOUND for non-existent tenant", async () => {
    const caller = createAdminCaller();

    await expect(
      caller.tenants.createApiKey({
        tenantId: "00000000-0000-0000-0000-000000000000",
        name: "Test Key",
      })
    ).rejects.toThrow("Tenant not found");
  });
});

describe("Tenants Router - Access Control", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should reject non-admin access to list", async () => {
    const caller = createPublicCaller();
    await expect(caller.tenants.list()).rejects.toThrow();
  });

  it("should reject non-admin access to get", async () => {
    const caller = createPublicCaller();
    await expect(
      caller.tenants.get({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow();
  });

  it("should reject non-admin access to create", async () => {
    const caller = createPublicCaller();
    await expect(caller.tenants.create({ name: "Test", slug: "test" })).rejects.toThrow();
  });

  it("should reject non-admin access to update", async () => {
    const caller = createPublicCaller();
    await expect(
      caller.tenants.update({
        id: "00000000-0000-0000-0000-000000000000",
        data: { name: "Updated" },
      })
    ).rejects.toThrow();
  });

  it("should reject non-admin access to delete", async () => {
    const caller = createPublicCaller();
    await expect(
      caller.tenants.delete({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow();
  });

  it("should reject non-admin access to stats", async () => {
    const caller = createPublicCaller();
    await expect(
      caller.tenants.stats({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow();
  });

  it("should reject non-admin access to createApiKey", async () => {
    const caller = createPublicCaller();
    await expect(
      caller.tenants.createApiKey({
        tenantId: "00000000-0000-0000-0000-000000000000",
      })
    ).rejects.toThrow();
  });

  it("should reject regular user session access to admin endpoints", async () => {
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

      // Regular user cannot access admin endpoints
      await expect(caller.tenants.list()).rejects.toThrow();
      await expect(caller.tenants.create({ name: "Test", slug: "test" })).rejects.toThrow();
    });
  });
});
