/**
 * Integration tests for Row-Level Security enforcement.
 *
 * Tests verify that RLS policies correctly enforce tenant isolation,
 * preventing cross-tenant data access across all protected tables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestTenant,
  createTestTodo,
  createTestTodos,
  createTestTag,
  addTagToTodo,
  createTestUserWithApiKey,
  setTenantContext,
  resetTenantContext,
} from "../../helpers";

describe("Row-Level Security - Tenant Isolation", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("Todo Isolation", () => {
    it("should prevent Tenant A from reading Tenant B's todos", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-read-iso-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-read-iso-b-${Date.now()}`);

        // Create todos for both tenants
        const todoAId = await createTestTodo(client, tenantAId, { title: "Tenant A Private Todo" });
        const todoBId = await createTestTodo(client, tenantBId, { title: "Tenant B Private Todo" });

        // Tenant A should only see their own todo
        await setTenantContext(client, tenantAId);
        const { rows: tenantAView } = await client.query("SELECT * FROM todos");
        expect(tenantAView).toHaveLength(1);
        expect(tenantAView[0].title).toBe("Tenant A Private Todo");
        expect(tenantAView[0].id).toBe(todoAId);

        // Tenant A cannot see Tenant B's todo by ID
        const { rows: crossTenantRead } = await client.query("SELECT * FROM todos WHERE id = $1", [
          todoBId,
        ]);
        expect(crossTenantRead).toHaveLength(0);
        await resetTenantContext(client);

        // Verify Tenant B can still see their own todo
        await setTenantContext(client, tenantBId);
        const { rows: tenantBView } = await client.query("SELECT * FROM todos");
        expect(tenantBView).toHaveLength(1);
        expect(tenantBView[0].id).toBe(todoBId);
        await resetTenantContext(client);
      });
    });

    it("should prevent Tenant A from updating Tenant B's todos", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-update-iso-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-update-iso-b-${Date.now()}`);

        const todoBId = await createTestTodo(client, tenantBId, {
          title: "Tenant B Original",
          status: "pending",
        });

        // Tenant A attempts to update Tenant B's todo
        await setTenantContext(client, tenantAId);
        const { rowCount: updateCount } = await client.query(
          "UPDATE todos SET title = $1, status = $2 WHERE id = $3",
          ["Hacked by Tenant A!", "completed", todoBId]
        );
        expect(updateCount).toBe(0); // No rows affected due to RLS
        await resetTenantContext(client);

        // Verify Tenant B's todo is unchanged
        await setTenantContext(client, tenantBId);
        const { rows } = await client.query("SELECT * FROM todos WHERE id = $1", [todoBId]);
        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe("Tenant B Original");
        expect(rows[0].status).toBe("pending");
        await resetTenantContext(client);
      });
    });

    it("should prevent Tenant A from deleting Tenant B's todos", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-delete-iso-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-delete-iso-b-${Date.now()}`);

        const todoBId = await createTestTodo(client, tenantBId, { title: "Tenant B Protected" });

        // Tenant A attempts to delete Tenant B's todo
        await setTenantContext(client, tenantAId);
        const { rowCount: deleteCount } = await client.query("DELETE FROM todos WHERE id = $1", [
          todoBId,
        ]);
        expect(deleteCount).toBe(0); // No rows affected due to RLS
        await resetTenantContext(client);

        // Verify Tenant B's todo still exists
        await setTenantContext(client, tenantBId);
        const { rows } = await client.query("SELECT * FROM todos WHERE id = $1", [todoBId]);
        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe("Tenant B Protected");
        await resetTenantContext(client);
      });
    });

    it("should isolate todos in bulk operations", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-bulk-iso-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-bulk-iso-b-${Date.now()}`);

        // Create multiple todos for each tenant
        await createTestTodos(client, tenantAId, 5, { titlePrefix: "Tenant A" });
        await createTestTodos(client, tenantBId, 3, { titlePrefix: "Tenant B" });

        // Tenant A tries to bulk update all todos
        await setTenantContext(client, tenantAId);
        const { rowCount: updateCount } = await client.query(
          "UPDATE todos SET status = 'completed'"
        );
        // Should only update Tenant A's 5 todos
        expect(updateCount).toBe(5);
        await resetTenantContext(client);

        // Verify Tenant B's todos are still pending
        await setTenantContext(client, tenantBId);
        const { rows } = await client.query("SELECT status FROM todos");
        expect(rows).toHaveLength(3);
        rows.forEach((row) => expect(row.status).toBe("pending"));
        await resetTenantContext(client);
      });
    });
  });

  describe("Tag Isolation", () => {
    it("should prevent Tenant A from reading Tenant B's tags", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-tag-read-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-tag-read-b-${Date.now()}`);

        const tagAId = await createTestTag(client, tenantAId, {
          name: "Tenant A Tag",
          color: "#ff0000",
        });
        const tagBId = await createTestTag(client, tenantBId, {
          name: "Tenant B Tag",
          color: "#00ff00",
        });

        // Tenant A should only see their own tag
        await setTenantContext(client, tenantAId);
        const { rows: tenantAView } = await client.query("SELECT * FROM tags");
        expect(tenantAView).toHaveLength(1);
        expect(tenantAView[0].name).toBe("Tenant A Tag");
        expect(tenantAView[0].id).toBe(tagAId);

        // Tenant A cannot see Tenant B's tag by ID
        const { rows: crossTenantRead } = await client.query("SELECT * FROM tags WHERE id = $1", [
          tagBId,
        ]);
        expect(crossTenantRead).toHaveLength(0);
        await resetTenantContext(client);
      });
    });

    it("should prevent Tenant A from updating Tenant B's tags", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-tag-update-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-tag-update-b-${Date.now()}`);

        const tagBId = await createTestTag(client, tenantBId, {
          name: "Tenant B Original Tag",
          color: "#0000ff",
        });

        // Tenant A attempts to update Tenant B's tag
        await setTenantContext(client, tenantAId);
        const { rowCount: updateCount } = await client.query(
          "UPDATE tags SET name = $1, color = $2 WHERE id = $3",
          ["Hacked Tag!", "#ff0000", tagBId]
        );
        expect(updateCount).toBe(0);
        await resetTenantContext(client);

        // Verify Tenant B's tag is unchanged
        await setTenantContext(client, tenantBId);
        const { rows } = await client.query("SELECT * FROM tags WHERE id = $1", [tagBId]);
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe("Tenant B Original Tag");
        expect(rows[0].color).toBe("#0000ff");
        await resetTenantContext(client);
      });
    });

    it("should prevent Tenant A from deleting Tenant B's tags", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-tag-delete-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-tag-delete-b-${Date.now()}`);

        const tagBId = await createTestTag(client, tenantBId, { name: "Tenant B Protected Tag" });

        // Tenant A attempts to delete Tenant B's tag
        await setTenantContext(client, tenantAId);
        const { rowCount: deleteCount } = await client.query("DELETE FROM tags WHERE id = $1", [
          tagBId,
        ]);
        expect(deleteCount).toBe(0);
        await resetTenantContext(client);

        // Verify Tenant B's tag still exists
        await setTenantContext(client, tenantBId);
        const { rows } = await client.query("SELECT * FROM tags WHERE id = $1", [tagBId]);
        expect(rows).toHaveLength(1);
        await resetTenantContext(client);
      });
    });
  });

  describe("Todo-Tag Relationship Isolation", () => {
    it("should prevent cross-tenant access to todo_tags", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-todotag-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-todotag-b-${Date.now()}`);

        // Create todo and tag for Tenant B, then link them
        const todoBId = await createTestTodo(client, tenantBId, { title: "Tenant B Todo" });
        const tagBId = await createTestTag(client, tenantBId, { name: "Tenant B Tag" });
        await addTagToTodo(client, tenantBId, todoBId, tagBId);

        // Tenant A should not see the todo_tags relationship
        await setTenantContext(client, tenantAId);
        const { rows: crossAccess } = await client.query("SELECT * FROM todo_tags");
        expect(crossAccess).toHaveLength(0);
        await resetTenantContext(client);

        // Verify Tenant B can see their own relationship
        await setTenantContext(client, tenantBId);
        const { rows: ownAccess } = await client.query("SELECT * FROM todo_tags");
        expect(ownAccess).toHaveLength(1);
        await resetTenantContext(client);
      });
    });

    it("should prevent Tenant A from removing tags from Tenant B's todos", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-remove-todotag-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-remove-todotag-b-${Date.now()}`);

        const todoBId = await createTestTodo(client, tenantBId, { title: "Tenant B Todo" });
        const tagBId = await createTestTag(client, tenantBId, { name: "Tenant B Tag" });
        await addTagToTodo(client, tenantBId, todoBId, tagBId);

        // Tenant A attempts to remove the tag relationship
        await setTenantContext(client, tenantAId);
        const { rowCount: deleteCount } = await client.query(
          "DELETE FROM todo_tags WHERE todo_id = $1 AND tag_id = $2",
          [todoBId, tagBId]
        );
        expect(deleteCount).toBe(0);
        await resetTenantContext(client);

        // Verify relationship still exists for Tenant B
        await setTenantContext(client, tenantBId);
        const { rows } = await client.query(
          "SELECT * FROM todo_tags WHERE todo_id = $1 AND tag_id = $2",
          [todoBId, tagBId]
        );
        expect(rows).toHaveLength(1);
        await resetTenantContext(client);
      });
    });
  });

  describe("API Key Isolation", () => {
    it("should prevent Tenant A from reading Tenant B's API keys", async () => {
      await withTestClient(async (client) => {
        const tenantAData = await createTestUserWithApiKey(client, {
          email: `test-apikey-a-${Date.now()}@test.com`,
          tenantSlug: `test-apikey-a-${Date.now()}`,
        });
        const tenantBData = await createTestUserWithApiKey(client, {
          email: `test-apikey-b-${Date.now()}@test.com`,
          tenantSlug: `test-apikey-b-${Date.now()}`,
        });

        // Tenant A should only see their own API keys
        await setTenantContext(client, tenantAData.tenantId);
        const { rows: tenantAView } = await client.query("SELECT * FROM api_keys");
        expect(tenantAView).toHaveLength(1);
        expect(tenantAView[0].tenant_id).toBe(tenantAData.tenantId);
        await resetTenantContext(client);

        // Tenant B should only see their own API keys
        await setTenantContext(client, tenantBData.tenantId);
        const { rows: tenantBView } = await client.query("SELECT * FROM api_keys");
        expect(tenantBView).toHaveLength(1);
        expect(tenantBView[0].tenant_id).toBe(tenantBData.tenantId);
        await resetTenantContext(client);
      });
    });
  });

  describe("Cross-Tenant Operations - Silent Failure", () => {
    it("should return empty result (not error) for cross-tenant reads", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-silent-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-silent-b-${Date.now()}`);

        await createTestTodo(client, tenantBId, { title: "Tenant B Todo" });

        // Cross-tenant query should silently return empty, not throw error
        await setTenantContext(client, tenantAId);

        // This should not throw
        const result = await client.query("SELECT * FROM todos");
        expect(result.rows).toHaveLength(0);
        expect(result.rowCount).toBe(0);

        await resetTenantContext(client);
      });
    });

    it("should return 0 affected rows (not error) for cross-tenant updates", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-silent-update-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-silent-update-b-${Date.now()}`);

        const todoBId = await createTestTodo(client, tenantBId, { title: "Tenant B Todo" });

        await setTenantContext(client, tenantAId);

        // This should not throw, just return 0 affected
        const result = await client.query("UPDATE todos SET title = $1 WHERE id = $2", [
          "Hacked!",
          todoBId,
        ]);
        expect(result.rowCount).toBe(0);

        await resetTenantContext(client);
      });
    });

    it("should return 0 affected rows (not error) for cross-tenant deletes", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-silent-delete-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-silent-delete-b-${Date.now()}`);

        const todoBId = await createTestTodo(client, tenantBId, { title: "Tenant B Todo" });

        await setTenantContext(client, tenantAId);

        // This should not throw, just return 0 affected
        const result = await client.query("DELETE FROM todos WHERE id = $1", [todoBId]);
        expect(result.rowCount).toBe(0);

        await resetTenantContext(client);
      });
    });
  });
});

describe("Row-Level Security - Context Switching", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("No Context", () => {
    it("should return empty for queries without tenant context", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-no-context-${Date.now()}`);
        await createTestTodos(client, tenantId, 5);

        // Query without setting tenant context
        const { rows: todos } = await client.query("SELECT * FROM todos");
        expect(todos).toHaveLength(0);

        const { rows: tags } = await client.query("SELECT * FROM tags");
        expect(tags).toHaveLength(0);
      });
    });

    it("should allow inserts with explicit tenant_id even without context", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-explicit-insert-${Date.now()}`);

        // Insert without tenant context set, but with explicit tenant_id
        // Note: This should fail due to RLS WITH CHECK policy
        await expect(
          client.query("INSERT INTO todos (tenant_id, title) VALUES ($1, $2)", [
            tenantId,
            "Test Todo",
          ])
        ).rejects.toThrow(); // RLS policy prevents insert without context
      });
    });
  });

  describe("Setting Context", () => {
    it("should enable access when tenant context is set", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-set-context-${Date.now()}`);
        await createTestTodos(client, tenantId, 3, { titlePrefix: "Visible Todo" });

        // Before setting context
        const { rows: before } = await client.query("SELECT * FROM todos");
        expect(before).toHaveLength(0);

        // After setting context
        await setTenantContext(client, tenantId);
        const { rows: after } = await client.query("SELECT * FROM todos");
        expect(after).toHaveLength(3);
        after.forEach((row) => expect(row.title).toMatch(/^Visible Todo/));
        await resetTenantContext(client);
      });
    });

    it("should allow inserts when tenant context matches tenant_id", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-insert-context-${Date.now()}`);

        await setTenantContext(client, tenantId);
        const { rows } = await client.query(
          "INSERT INTO todos (tenant_id, title) VALUES ($1, $2) RETURNING id",
          [tenantId, "New Todo"]
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBeDefined();
        await resetTenantContext(client);
      });
    });
  });

  describe("Switching Context", () => {
    it("should change visible data when switching tenant context", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-switch-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-switch-b-${Date.now()}`);

        await createTestTodos(client, tenantAId, 2, { titlePrefix: "Tenant A" });
        await createTestTodos(client, tenantBId, 4, { titlePrefix: "Tenant B" });

        // Switch to Tenant A
        await setTenantContext(client, tenantAId);
        const { rows: viewA } = await client.query("SELECT * FROM todos");
        expect(viewA).toHaveLength(2);
        viewA.forEach((row) => expect(row.title).toMatch(/^Tenant A/));

        // Switch to Tenant B (without resetting first)
        await setTenantContext(client, tenantBId);
        const { rows: viewB } = await client.query("SELECT * FROM todos");
        expect(viewB).toHaveLength(4);
        viewB.forEach((row) => expect(row.title).toMatch(/^Tenant B/));

        await resetTenantContext(client);
      });
    });

    it("should update context for all RLS-protected tables simultaneously", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-multi-table-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-multi-table-b-${Date.now()}`);

        // Create data for both tenants
        const todoAId = await createTestTodo(client, tenantAId, { title: "Todo A" });
        const tagAId = await createTestTag(client, tenantAId, { name: "Tag A" });
        await addTagToTodo(client, tenantAId, todoAId, tagAId);

        const todoBId = await createTestTodo(client, tenantBId, { title: "Todo B" });
        const tagBId = await createTestTag(client, tenantBId, { name: "Tag B" });
        await addTagToTodo(client, tenantBId, todoBId, tagBId);

        // Check Tenant A context
        await setTenantContext(client, tenantAId);
        const { rows: todosA } = await client.query("SELECT * FROM todos");
        const { rows: tagsA } = await client.query("SELECT * FROM tags");
        const { rows: todoTagsA } = await client.query("SELECT * FROM todo_tags");
        expect(todosA).toHaveLength(1);
        expect(todosA[0].title).toBe("Todo A");
        expect(tagsA).toHaveLength(1);
        expect(tagsA[0].name).toBe("Tag A");
        expect(todoTagsA).toHaveLength(1);

        // Switch to Tenant B context
        await setTenantContext(client, tenantBId);
        const { rows: todosB } = await client.query("SELECT * FROM todos");
        const { rows: tagsB } = await client.query("SELECT * FROM tags");
        const { rows: todoTagsB } = await client.query("SELECT * FROM todo_tags");
        expect(todosB).toHaveLength(1);
        expect(todosB[0].title).toBe("Todo B");
        expect(tagsB).toHaveLength(1);
        expect(tagsB[0].name).toBe("Tag B");
        expect(todoTagsB).toHaveLength(1);

        await resetTenantContext(client);
      });
    });
  });

  describe("Clearing Context", () => {
    it("should remove access when tenant context is cleared", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-clear-context-${Date.now()}`);
        await createTestTodos(client, tenantId, 3);

        // With context
        await setTenantContext(client, tenantId);
        const { rows: with_context } = await client.query("SELECT * FROM todos");
        expect(with_context).toHaveLength(3);

        // After clearing context
        await resetTenantContext(client);
        const { rows: without_context } = await client.query("SELECT * FROM todos");
        expect(without_context).toHaveLength(0);
      });
    });

    it("should prevent modifications after context is cleared", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-mod-cleared-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Original" });

        // Clear context and try to update
        await resetTenantContext(client);
        const { rowCount } = await client.query("UPDATE todos SET title = $1 WHERE id = $2", [
          "Modified",
          todoId,
        ]);
        expect(rowCount).toBe(0);

        // Verify original is unchanged
        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT title FROM todos WHERE id = $1", [todoId]);
        expect(rows[0].title).toBe("Original");
        await resetTenantContext(client);
      });
    });
  });
});

describe("Row-Level Security - Edge Cases", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("Insert with Wrong Tenant ID", () => {
    it("should reject insert when tenant_id does not match context", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-wrong-insert-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-wrong-insert-b-${Date.now()}`);

        // Set context to Tenant A but try to insert with Tenant B's ID
        await setTenantContext(client, tenantAId);
        await expect(
          client.query("INSERT INTO todos (tenant_id, title) VALUES ($1, $2)", [
            tenantBId,
            "Injected Todo",
          ])
        ).rejects.toThrow(); // RLS WITH CHECK should prevent this
        await resetTenantContext(client);
      });
    });

    it("should reject insert for tags with mismatched tenant_id", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-wrong-tag-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-wrong-tag-b-${Date.now()}`);

        await setTenantContext(client, tenantAId);
        await expect(
          client.query("INSERT INTO tags (tenant_id, name) VALUES ($1, $2)", [
            tenantBId,
            "Injected Tag",
          ])
        ).rejects.toThrow();
        await resetTenantContext(client);
      });
    });
  });

  describe("UUID Manipulation", () => {
    it("should not allow access by guessing UUIDs", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-uuid-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-uuid-b-${Date.now()}`);

        // Create todo with known ID for Tenant B
        const todoBId = await createTestTodo(client, tenantBId, { title: "Secret Todo" });

        // Tenant A knows the UUID but still cannot access
        await setTenantContext(client, tenantAId);

        const { rows: read } = await client.query("SELECT * FROM todos WHERE id = $1", [todoBId]);
        expect(read).toHaveLength(0);

        const { rowCount: updateCount } = await client.query(
          "UPDATE todos SET title = $1 WHERE id = $2",
          ["Hacked!", todoBId]
        );
        expect(updateCount).toBe(0);

        const { rowCount: deleteCount } = await client.query("DELETE FROM todos WHERE id = $1", [
          todoBId,
        ]);
        expect(deleteCount).toBe(0);

        await resetTenantContext(client);
      });
    });
  });

  describe("Complex Queries", () => {
    it("should enforce RLS in JOIN queries", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-join-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-join-b-${Date.now()}`);

        // Create related data for both tenants
        const todoAId = await createTestTodo(client, tenantAId, { title: "A Todo" });
        const tagAId = await createTestTag(client, tenantAId, { name: "A Tag" });
        await addTagToTodo(client, tenantAId, todoAId, tagAId);

        const todoBId = await createTestTodo(client, tenantBId, { title: "B Todo" });
        const tagBId = await createTestTag(client, tenantBId, { name: "B Tag" });
        await addTagToTodo(client, tenantBId, todoBId, tagBId);

        // Tenant A's JOIN should only return their data
        await setTenantContext(client, tenantAId);
        const { rows } = await client.query(`
          SELECT t.title, tg.name as tag_name
          FROM todos t
          JOIN todo_tags tt ON t.id = tt.todo_id
          JOIN tags tg ON tt.tag_id = tg.id
        `);
        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe("A Todo");
        expect(rows[0].tag_name).toBe("A Tag");
        await resetTenantContext(client);
      });
    });

    it("should enforce RLS in subqueries", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-subquery-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-subquery-b-${Date.now()}`);

        await createTestTodos(client, tenantAId, 3, { priority: "high" });
        await createTestTodos(client, tenantBId, 5, { priority: "high" });

        await setTenantContext(client, tenantAId);
        const { rows } = await client.query(`
          SELECT * FROM todos
          WHERE priority = (
            SELECT DISTINCT priority FROM todos WHERE priority = 'high'
          )
        `);
        // Should only return Tenant A's 3 high priority todos
        expect(rows).toHaveLength(3);
        await resetTenantContext(client);
      });
    });

    it("should enforce RLS in aggregate queries", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-agg-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-agg-b-${Date.now()}`);

        await createTestTodos(client, tenantAId, 7);
        await createTestTodos(client, tenantBId, 13);

        await setTenantContext(client, tenantAId);
        const { rows } = await client.query("SELECT COUNT(*) as count FROM todos");
        expect(parseInt(rows[0].count)).toBe(7); // Only count Tenant A's todos
        await resetTenantContext(client);

        await setTenantContext(client, tenantBId);
        const { rows: rowsB } = await client.query("SELECT COUNT(*) as count FROM todos");
        expect(parseInt(rowsB[0].count)).toBe(13); // Only count Tenant B's todos
        await resetTenantContext(client);
      });
    });
  });

  describe("Transaction Boundary", () => {
    it("should maintain RLS context within a transaction", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-tx-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-tx-b-${Date.now()}`);

        await createTestTodo(client, tenantBId, { title: "Tenant B Todo" });

        await client.query("BEGIN");
        await setTenantContext(client, tenantAId);

        // All operations within transaction should use Tenant A context
        const { rows: read1 } = await client.query("SELECT * FROM todos");
        expect(read1).toHaveLength(0);

        await client.query("INSERT INTO todos (tenant_id, title) VALUES ($1, $2)", [
          tenantAId,
          "Tenant A Todo",
        ]);

        const { rows: read2 } = await client.query("SELECT * FROM todos");
        expect(read2).toHaveLength(1);
        expect(read2[0].title).toBe("Tenant A Todo");

        await client.query("COMMIT");
        await resetTenantContext(client);
      });
    });
  });
});
