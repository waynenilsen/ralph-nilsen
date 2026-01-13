/**
 * Integration tests for tenant database operations.
 *
 * Tests CRUD operations and cascade behavior for the tenants table.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestTenant,
  setTenantContext,
  resetTenantContext,
  createTestTodo,
  createTestTag,
  recordExists,
} from "../../helpers";

describe("Tenant Database Operations", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("Create Tenant", () => {
    it("should create a tenant with required fields", async () => {
      await withTestClient(async (client) => {
        const slug = `test-create-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        expect(tenantId).toBeDefined();
        expect(typeof tenantId).toBe("string");

        const { rows } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);

        expect(rows).toHaveLength(1);
        expect(rows[0].slug).toBe(slug);
        expect(rows[0].name).toBe(`Test Tenant ${slug}`);
        expect(rows[0].is_active).toBe(true);
        expect(rows[0].created_at).toBeInstanceOf(Date);
        expect(rows[0].updated_at).toBeInstanceOf(Date);
      });
    });

    it("should auto-generate UUID id", async () => {
      await withTestClient(async (client) => {
        const slug = `test-uuid-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        // UUID v4 format check
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(tenantId).toMatch(uuidRegex);
      });
    });

    it("should enforce unique slug constraint", async () => {
      await withTestClient(async (client) => {
        const slug = `test-unique-${Date.now()}`;
        await createTestTenant(client, slug);

        await expect(createTestTenant(client, slug)).rejects.toThrow();
      });
    });

    it("should set default timestamps", async () => {
      await withTestClient(async (client) => {
        const beforeCreate = new Date();
        const tenantId = await createTestTenant(client, `test-timestamps-${Date.now()}`);
        const afterCreate = new Date();

        const { rows } = await client.query(
          "SELECT created_at, updated_at FROM tenants WHERE id = $1",
          [tenantId]
        );

        expect(rows[0].created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
        expect(rows[0].created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
        expect(rows[0].updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
      });
    });
  });

  describe("Read Tenant", () => {
    it("should read tenant by ID", async () => {
      await withTestClient(async (client) => {
        const slug = `test-read-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        const { rows } = await client.query(
          "SELECT id, name, slug, is_active FROM tenants WHERE id = $1",
          [tenantId]
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(tenantId);
        expect(rows[0].slug).toBe(slug);
      });
    });

    it("should read tenant by slug", async () => {
      await withTestClient(async (client) => {
        const slug = `test-read-slug-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        const { rows } = await client.query("SELECT id, name FROM tenants WHERE slug = $1", [slug]);

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(tenantId);
      });
    });

    it("should return empty for non-existent tenant", async () => {
      await withTestClient(async (client) => {
        const { rows } = await client.query("SELECT * FROM tenants WHERE id = $1", [
          "00000000-0000-0000-0000-000000000000",
        ]);

        expect(rows).toHaveLength(0);
      });
    });
  });

  describe("Update Tenant", () => {
    it("should update tenant name", async () => {
      await withTestClient(async (client) => {
        const slug = `test-update-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        const newName = "Updated Tenant Name";
        await client.query("UPDATE tenants SET name = $1 WHERE id = $2", [newName, tenantId]);

        const { rows } = await client.query("SELECT name FROM tenants WHERE id = $1", [tenantId]);

        expect(rows[0].name).toBe(newName);
      });
    });

    it("should update tenant is_active status", async () => {
      await withTestClient(async (client) => {
        const slug = `test-deactivate-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        await client.query("UPDATE tenants SET is_active = $1 WHERE id = $2", [false, tenantId]);

        const { rows } = await client.query("SELECT is_active FROM tenants WHERE id = $1", [
          tenantId,
        ]);

        expect(rows[0].is_active).toBe(false);
      });
    });

    it("should auto-update updated_at on update", async () => {
      await withTestClient(async (client) => {
        const slug = `test-updated-at-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        const { rows: before } = await client.query(
          "SELECT updated_at FROM tenants WHERE id = $1",
          [tenantId]
        );

        // Small delay to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        await client.query("UPDATE tenants SET name = $1 WHERE id = $2", [
          "Changed Name",
          tenantId,
        ]);

        const { rows: after } = await client.query("SELECT updated_at FROM tenants WHERE id = $1", [
          tenantId,
        ]);

        expect(after[0].updated_at.getTime()).toBeGreaterThan(before[0].updated_at.getTime());
      });
    });
  });

  describe("Delete Tenant", () => {
    it("should delete tenant by ID", async () => {
      await withTestClient(async (client) => {
        const slug = `test-delete-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        await client.query("DELETE FROM tenants WHERE id = $1", [tenantId]);

        const exists = await recordExists(client, "tenants", tenantId);
        expect(exists).toBe(false);
      });
    });

    it("should cascade delete todos when tenant is deleted", async () => {
      await withTestClient(async (client) => {
        const slug = `test-cascade-todos-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        const todoId = await createTestTodo(client, tenantId, {
          title: "Test Todo for Cascade",
        });

        // Verify todo exists (use tenant context due to RLS)
        await setTenantContext(client, tenantId);
        const { rows: before } = await client.query("SELECT id FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);
        expect(before).toHaveLength(1);

        // Delete tenant
        await client.query("DELETE FROM tenants WHERE id = $1", [tenantId]);

        // Verify todo is also deleted (no tenant context needed - will return 0 due to cascade)
        const { rows: after } = await client.query("SELECT id FROM todos WHERE id = $1", [todoId]);
        expect(after).toHaveLength(0);
      });
    });

    it("should cascade delete tags when tenant is deleted", async () => {
      await withTestClient(async (client) => {
        const slug = `test-cascade-tags-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        const tagId = await createTestTag(client, tenantId, {
          name: "Test Tag for Cascade",
        });

        // Verify tag exists (use tenant context due to RLS)
        await setTenantContext(client, tenantId);
        const { rows: before } = await client.query("SELECT id FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);
        expect(before).toHaveLength(1);

        // Delete tenant
        await client.query("DELETE FROM tenants WHERE id = $1", [tenantId]);

        // Verify tag is also deleted (no tenant context needed - will return 0 due to cascade)
        const { rows: after } = await client.query("SELECT id FROM tags WHERE id = $1", [tagId]);
        expect(after).toHaveLength(0);
      });
    });

    it("should cascade delete todo_tags when tenant is deleted", async () => {
      await withTestClient(async (client) => {
        const slug = `test-cascade-todo-tags-${Date.now()}`;
        const tenantId = await createTestTenant(client, slug);

        const todoId = await createTestTodo(client, tenantId, { title: "Test Todo" });
        const tagId = await createTestTag(client, tenantId, { name: "Test Tag" });

        // Link todo and tag (within tenant context)
        await setTenantContext(client, tenantId);
        await client.query("INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)", [
          todoId,
          tagId,
        ]);

        // Verify todo_tags entry exists
        const { rows: before } = await client.query(
          "SELECT * FROM todo_tags WHERE todo_id = $1 AND tag_id = $2",
          [todoId, tagId]
        );
        await resetTenantContext(client);
        expect(before).toHaveLength(1);

        // Delete tenant
        await client.query("DELETE FROM tenants WHERE id = $1", [tenantId]);

        // Verify todo_tags entry is also deleted (will return 0 rows after cascade)
        const { rows: after } = await client.query(
          "SELECT * FROM todo_tags WHERE todo_id = $1 AND tag_id = $2",
          [todoId, tagId]
        );
        expect(after).toHaveLength(0);
      });
    });
  });
});
