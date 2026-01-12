/**
 * Integration tests for tag database operations.
 *
 * Tests CRUD operations, cascade behavior, and todo-tag relationships.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestTenant,
  createTestTag,
  createTestTodo,
  addTagToTodo,
  setTenantContext,
  resetTenantContext,
  recordExists,
} from "../../helpers";

describe("Tag Database Operations", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("Create Tag", () => {
    it("should create a tag with required fields", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-create-tag-${Date.now()}`);

        const tagId = await createTestTag(client, tenantId, {
          name: "Work",
        });

        expect(tagId).toBeDefined();

        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT * FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);

        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe("Work");
        expect(rows[0].tenant_id).toBe(tenantId);
        expect(rows[0].color).toBe("#000000");
        expect(rows[0].created_at).toBeInstanceOf(Date);
      });
    });

    it("should create a tag with custom color", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-tag-color-${Date.now()}`);

        const tagId = await createTestTag(client, tenantId, {
          name: "Urgent",
          color: "#ff0000",
        });

        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT color FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);

        expect(rows[0].color).toBe("#ff0000");
      });
    });

    it("should enforce unique name per tenant", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-unique-name-${Date.now()}`);

        await createTestTag(client, tenantId, { name: "UniqueTag" });

        await expect(createTestTag(client, tenantId, { name: "UniqueTag" })).rejects.toThrow();
      });
    });

    it("should allow same name in different tenants", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-same-name-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-same-name-b-${Date.now()}`);

        const tagAId = await createTestTag(client, tenantAId, { name: "SharedName" });
        const tagBId = await createTestTag(client, tenantBId, { name: "SharedName" });

        expect(tagAId).toBeDefined();
        expect(tagBId).toBeDefined();
        expect(tagAId).not.toBe(tagBId);
      });
    });
  });

  describe("Update Tag", () => {
    it("should update tag name", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-update-name-${Date.now()}`);
        const tagId = await createTestTag(client, tenantId, { name: "Original" });

        await setTenantContext(client, tenantId);
        await client.query("UPDATE tags SET name = $1 WHERE id = $2", ["Updated", tagId]);

        const { rows } = await client.query("SELECT name FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);

        expect(rows[0].name).toBe("Updated");
      });
    });

    it("should update tag color", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-update-color-${Date.now()}`);
        const tagId = await createTestTag(client, tenantId, {
          name: "Colorful",
          color: "#000000",
        });

        await setTenantContext(client, tenantId);
        await client.query("UPDATE tags SET color = $1 WHERE id = $2", ["#00ff00", tagId]);

        const { rows } = await client.query("SELECT color FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);

        expect(rows[0].color).toBe("#00ff00");
      });
    });

    it("should not update tag from different tenant", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-cross-update-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-cross-update-b-${Date.now()}`);

        const tagId = await createTestTag(client, tenantAId, { name: "Tenant A Tag" });

        await setTenantContext(client, tenantBId);
        const { rowCount } = await client.query("UPDATE tags SET name = $1 WHERE id = $2", [
          "Hacked!",
          tagId,
        ]);
        await resetTenantContext(client);

        expect(rowCount).toBe(0);

        // Verify original is unchanged
        await setTenantContext(client, tenantAId);
        const { rows } = await client.query("SELECT name FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);

        expect(rows[0].name).toBe("Tenant A Tag");
      });
    });
  });

  describe("Delete Tag", () => {
    it("should delete tag by ID", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-delete-tag-${Date.now()}`);
        const tagId = await createTestTag(client, tenantId, { name: "ToDelete" });

        await setTenantContext(client, tenantId);
        await client.query("DELETE FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);

        expect(await recordExists(client, "tags", tagId)).toBe(false);
      });
    });

    it("should cascade delete todo_tags when tag is deleted", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-cascade-todo-tags-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Test Todo" });
        const tagId = await createTestTag(client, tenantId, { name: "Test Tag" });

        await addTagToTodo(client, tenantId, todoId, tagId);

        // Verify todo_tags entry exists (need tenant context due to RLS)
        await setTenantContext(client, tenantId);
        const { rows: before } = await client.query("SELECT * FROM todo_tags WHERE tag_id = $1", [
          tagId,
        ]);
        expect(before).toHaveLength(1);

        // Delete tag
        await client.query("DELETE FROM tags WHERE id = $1", [tagId]);

        // Verify todo_tags entry is also deleted
        const { rows: after } = await client.query("SELECT * FROM todo_tags WHERE tag_id = $1", [
          tagId,
        ]);
        expect(after).toHaveLength(0);

        // But todo should still exist (check with tenant context)
        const { rows: todoCheck } = await client.query("SELECT id FROM todos WHERE id = $1", [
          todoId,
        ]);
        await resetTenantContext(client);
        expect(todoCheck).toHaveLength(1);
      });
    });

    it("should not delete tag from different tenant", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-cross-delete-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-cross-delete-b-${Date.now()}`);

        const tagId = await createTestTag(client, tenantAId, { name: "Tenant A Tag" });

        await setTenantContext(client, tenantBId);
        const { rowCount } = await client.query("DELETE FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);

        expect(rowCount).toBe(0);

        // Verify tag still exists (check with tenant A context)
        await setTenantContext(client, tenantAId);
        const { rows } = await client.query("SELECT id FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);
        expect(rows).toHaveLength(1);
      });
    });
  });

  describe("Add Tag to Todo", () => {
    it("should add a tag to a todo", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-add-tag-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Test Todo" });
        const tagId = await createTestTag(client, tenantId, { name: "Test Tag" });

        await addTagToTodo(client, tenantId, todoId, tagId);

        // Need tenant context to query todo_tags due to RLS
        await setTenantContext(client, tenantId);
        const { rows } = await client.query(
          "SELECT * FROM todo_tags WHERE todo_id = $1 AND tag_id = $2",
          [todoId, tagId]
        );
        await resetTenantContext(client);

        expect(rows).toHaveLength(1);
      });
    });

    it("should handle duplicate tag assignment gracefully", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-duplicate-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Test Todo" });
        const tagId = await createTestTag(client, tenantId, { name: "Test Tag" });

        await addTagToTodo(client, tenantId, todoId, tagId);

        // Should not throw when adding same tag again (ON CONFLICT DO NOTHING)
        await addTagToTodo(client, tenantId, todoId, tagId);

        // Need tenant context to query todo_tags due to RLS
        await setTenantContext(client, tenantId);
        const { rows } = await client.query(
          "SELECT * FROM todo_tags WHERE todo_id = $1 AND tag_id = $2",
          [todoId, tagId]
        );
        await resetTenantContext(client);

        expect(rows).toHaveLength(1);
      });
    });

    it("should add multiple tags to a todo", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-multi-tags-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Test Todo" });

        const tag1Id = await createTestTag(client, tenantId, { name: "Tag 1" });
        const tag2Id = await createTestTag(client, tenantId, { name: "Tag 2" });
        const tag3Id = await createTestTag(client, tenantId, { name: "Tag 3" });

        await addTagToTodo(client, tenantId, todoId, tag1Id);
        await addTagToTodo(client, tenantId, todoId, tag2Id);
        await addTagToTodo(client, tenantId, todoId, tag3Id);

        // Need tenant context to query todo_tags due to RLS
        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT * FROM todo_tags WHERE todo_id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rows).toHaveLength(3);
      });
    });

    it("should add same tag to multiple todos", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-shared-tag-${Date.now()}`);

        const todo1Id = await createTestTodo(client, tenantId, { title: "Todo 1" });
        const todo2Id = await createTestTodo(client, tenantId, { title: "Todo 2" });
        const tagId = await createTestTag(client, tenantId, { name: "Shared Tag" });

        await addTagToTodo(client, tenantId, todo1Id, tagId);
        await addTagToTodo(client, tenantId, todo2Id, tagId);

        // Need tenant context to query todo_tags due to RLS
        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT * FROM todo_tags WHERE tag_id = $1", [tagId]);
        await resetTenantContext(client);

        expect(rows).toHaveLength(2);
      });
    });
  });

  describe("Remove Tag from Todo", () => {
    it("should remove a tag from a todo", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-remove-tag-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Test Todo" });
        const tagId = await createTestTag(client, tenantId, { name: "Test Tag" });

        await addTagToTodo(client, tenantId, todoId, tagId);

        // Need tenant context for all todo_tags operations due to RLS
        await setTenantContext(client, tenantId);

        // Verify it was added
        const { rows: before } = await client.query(
          "SELECT * FROM todo_tags WHERE todo_id = $1 AND tag_id = $2",
          [todoId, tagId]
        );
        expect(before).toHaveLength(1);

        // Remove the tag
        await client.query("DELETE FROM todo_tags WHERE todo_id = $1 AND tag_id = $2", [
          todoId,
          tagId,
        ]);

        // Verify it was removed
        const { rows: after } = await client.query(
          "SELECT * FROM todo_tags WHERE todo_id = $1 AND tag_id = $2",
          [todoId, tagId]
        );
        expect(after).toHaveLength(0);

        // Both todo and tag should still exist (check with tenant context)
        const { rows: todoCheck } = await client.query("SELECT id FROM todos WHERE id = $1", [
          todoId,
        ]);
        const { rows: tagCheck } = await client.query("SELECT id FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);

        expect(todoCheck).toHaveLength(1);
        expect(tagCheck).toHaveLength(1);
      });
    });

    it("should cascade delete todo_tags when todo is deleted", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-cascade-on-todo-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Test Todo" });
        const tagId = await createTestTag(client, tenantId, { name: "Test Tag" });

        await addTagToTodo(client, tenantId, todoId, tagId);

        // Need tenant context for todo_tags operations due to RLS
        await setTenantContext(client, tenantId);

        // Verify todo_tags entry exists
        const { rows: before } = await client.query("SELECT * FROM todo_tags WHERE todo_id = $1", [
          todoId,
        ]);
        expect(before).toHaveLength(1);

        // Delete todo
        await client.query("DELETE FROM todos WHERE id = $1", [todoId]);

        // Verify todo_tags entry is also deleted (query will return 0 due to cascade)
        const { rows: after } = await client.query("SELECT * FROM todo_tags WHERE todo_id = $1", [
          todoId,
        ]);
        expect(after).toHaveLength(0);

        // But tag should still exist (check with tenant context)
        const { rows: tagCheck } = await client.query("SELECT id FROM tags WHERE id = $1", [tagId]);
        await resetTenantContext(client);

        expect(tagCheck).toHaveLength(1);
      });
    });
  });

  describe("Query Todos by Tag", () => {
    it("should find todos with a specific tag", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-query-by-tag-${Date.now()}`);

        const todo1Id = await createTestTodo(client, tenantId, { title: "Todo with tag" });
        const todo2Id = await createTestTodo(client, tenantId, { title: "Another with tag" });
        await createTestTodo(client, tenantId, { title: "No tag" });

        const tagId = await createTestTag(client, tenantId, { name: "Important" });

        await addTagToTodo(client, tenantId, todo1Id, tagId);
        await addTagToTodo(client, tenantId, todo2Id, tagId);

        await setTenantContext(client, tenantId);
        const { rows } = await client.query(
          `SELECT t.* FROM todos t
           INNER JOIN todo_tags tt ON t.id = tt.todo_id
           WHERE tt.tag_id = $1`,
          [tagId]
        );
        await resetTenantContext(client);

        expect(rows).toHaveLength(2);
      });
    });

    it("should find todos with any of multiple tags", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-any-tags-${Date.now()}`);

        const todo1Id = await createTestTodo(client, tenantId, { title: "Todo 1" });
        const todo2Id = await createTestTodo(client, tenantId, { title: "Todo 2" });
        const todo3Id = await createTestTodo(client, tenantId, { title: "Todo 3" });

        const tag1Id = await createTestTag(client, tenantId, { name: "Tag1" });
        const tag2Id = await createTestTag(client, tenantId, { name: "Tag2" });

        await addTagToTodo(client, tenantId, todo1Id, tag1Id);
        await addTagToTodo(client, tenantId, todo2Id, tag2Id);
        // todo3 has no tags

        await setTenantContext(client, tenantId);
        const { rows } = await client.query(
          `SELECT DISTINCT t.* FROM todos t
           INNER JOIN todo_tags tt ON t.id = tt.todo_id
           WHERE tt.tag_id = ANY($1::uuid[])`,
          [[tag1Id, tag2Id]]
        );
        await resetTenantContext(client);

        expect(rows).toHaveLength(2);
      });
    });

    it("should find todos with all specified tags", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-all-tags-${Date.now()}`);

        const todo1Id = await createTestTodo(client, tenantId, { title: "Has both tags" });
        const todo2Id = await createTestTodo(client, tenantId, { title: "Has only tag1" });
        const todo3Id = await createTestTodo(client, tenantId, { title: "Has only tag2" });

        const tag1Id = await createTestTag(client, tenantId, { name: "Tag1" });
        const tag2Id = await createTestTag(client, tenantId, { name: "Tag2" });

        await addTagToTodo(client, tenantId, todo1Id, tag1Id);
        await addTagToTodo(client, tenantId, todo1Id, tag2Id);
        await addTagToTodo(client, tenantId, todo2Id, tag1Id);
        await addTagToTodo(client, tenantId, todo3Id, tag2Id);

        await setTenantContext(client, tenantId);
        const { rows } = await client.query(
          `SELECT t.* FROM todos t
           WHERE (
             SELECT COUNT(DISTINCT tt.tag_id) FROM todo_tags tt
             WHERE tt.todo_id = t.id AND tt.tag_id = ANY($1::uuid[])
           ) = $2`,
          [[tag1Id, tag2Id], 2]
        );
        await resetTenantContext(client);

        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe("Has both tags");
      });
    });
  });

  describe("Query Tags for Todo", () => {
    it("should get all tags for a todo", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-tags-for-todo-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Multi-tag Todo" });

        const tag1Id = await createTestTag(client, tenantId, { name: "Tag A", color: "#ff0000" });
        const tag2Id = await createTestTag(client, tenantId, { name: "Tag B", color: "#00ff00" });
        const tag3Id = await createTestTag(client, tenantId, { name: "Tag C", color: "#0000ff" });

        await addTagToTodo(client, tenantId, todoId, tag1Id);
        await addTagToTodo(client, tenantId, todoId, tag2Id);
        await addTagToTodo(client, tenantId, todoId, tag3Id);

        await setTenantContext(client, tenantId);
        const { rows } = await client.query(
          `SELECT tg.* FROM tags tg
           INNER JOIN todo_tags tt ON tg.id = tt.tag_id
           WHERE tt.todo_id = $1
           ORDER BY tg.name`,
          [todoId]
        );
        await resetTenantContext(client);

        expect(rows).toHaveLength(3);
        expect(rows[0].name).toBe("Tag A");
        expect(rows[1].name).toBe("Tag B");
        expect(rows[2].name).toBe("Tag C");
      });
    });
  });
});
