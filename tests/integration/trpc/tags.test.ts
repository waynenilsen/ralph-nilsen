/**
 * Integration tests for the tags tRPC router.
 *
 * Tests verify all CRUD operations work with both session and API key
 * authentication, as well as getting todos by tag.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestUserWithSession,
  createTestUserWithApiKey,
  createTestTag,
  createTestTodo,
  addTagToTodo,
} from "../../helpers";
import {
  createSessionCaller,
  createApiKeyCaller,
  createPublicCaller,
  createTestApiKeyObject,
} from "../../helpers/api";

describe("Tags Router - CRUD with Session Auth", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should list tags with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      await createTestTag(client, tenantId, { name: "Tag1" });
      await createTestTag(client, tenantId, { name: "Tag2" });
      await createTestTag(client, tenantId, { name: "Tag3" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.tags.list();

      expect(result).toHaveLength(3);
    });
  });

  it("should get a single tag with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const tagId = await createTestTag(client, tenantId, { name: "My Tag", color: "#ff0000" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.tags.get({ id: tagId });

      expect(result.id).toBe(tagId);
      expect(result.name).toBe("My Tag");
      expect(result.color).toBe("#ff0000");
    });
  });

  it("should create a tag with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.tags.create({
        name: "New Tag",
        color: "#00ff00",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("New Tag");
      expect(result.color).toBe("#00ff00");
      expect(result.tenant_id).toBe(tenantId);
    });
  });

  it("should update a tag with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const tagId = await createTestTag(client, tenantId, { name: "Original", color: "#000000" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.tags.update({
        id: tagId,
        data: {
          name: "Updated",
          color: "#ffffff",
        },
      });

      expect(result.name).toBe("Updated");
      expect(result.color).toBe("#ffffff");
    });
  });

  it("should delete a tag with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const tagId = await createTestTag(client, tenantId, { name: "To Delete" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.tags.delete({ id: tagId });
      expect(result.success).toBe(true);

      // Verify tag is deleted
      await expect(caller.tags.get({ id: tagId })).rejects.toThrow("Tag not found");
    });
  });
});

describe("Tags Router - CRUD with API Key Auth", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should list tags with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);

      await createTestTag(client, tenantId, { name: "API Tag 1" });
      await createTestTag(client, tenantId, { name: "API Tag 2" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);

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

  it("should get a single tag with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);
      const tagId = await createTestTag(client, tenantId, { name: "API Tag" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);

      const apiKeyObj = createTestApiKeyObject(tenantId, userId);
      const caller = createApiKeyCaller({
        user: users[0],
        tenant: tenants[0],
        apiKey: apiKeyObj,
        rawKey: apiKey,
      });

      const result = await caller.tags.get({ id: tagId });

      expect(result.id).toBe(tagId);
      expect(result.name).toBe("API Tag");
    });
  });

  it("should create a tag with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);

      const apiKeyObj = createTestApiKeyObject(tenantId, userId);
      const caller = createApiKeyCaller({
        user: users[0],
        tenant: tenants[0],
        apiKey: apiKeyObj,
        rawKey: apiKey,
      });

      const result = await caller.tags.create({
        name: "API Created Tag",
        color: "#123456",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("API Created Tag");
    });
  });

  it("should update a tag with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);
      const tagId = await createTestTag(client, tenantId, { name: "Original" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);

      const apiKeyObj = createTestApiKeyObject(tenantId, userId);
      const caller = createApiKeyCaller({
        user: users[0],
        tenant: tenants[0],
        apiKey: apiKeyObj,
        rawKey: apiKey,
      });

      const result = await caller.tags.update({
        id: tagId,
        data: { name: "API Updated" },
      });

      expect(result.name).toBe("API Updated");
    });
  });

  it("should delete a tag with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);
      const tagId = await createTestTag(client, tenantId, { name: "To Delete" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);

      const apiKeyObj = createTestApiKeyObject(tenantId, userId);
      const caller = createApiKeyCaller({
        user: users[0],
        tenant: tenants[0],
        apiKey: apiKeyObj,
        rawKey: apiKey,
      });

      const result = await caller.tags.delete({ id: tagId });
      expect(result.success).toBe(true);
    });
  });
});

describe("Tags Router - Get Todos by Tag", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should get todos associated with a tag", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      const tagId = await createTestTag(client, tenantId, { name: "Important" });
      const todo1Id = await createTestTodo(client, tenantId, { title: "Todo 1" });
      const todo2Id = await createTestTodo(client, tenantId, { title: "Todo 2" });
      const todo3Id = await createTestTodo(client, tenantId, { title: "Todo 3" });

      // Add tag to todo1 and todo2
      await addTagToTodo(client, tenantId, todo1Id, tagId);
      await addTagToTodo(client, tenantId, todo2Id, tagId);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.tags.getTodos({ tagId });

      expect(result).toHaveLength(2);
      const todoIds = result.map((t) => t.id);
      expect(todoIds).toContain(todo1Id);
      expect(todoIds).toContain(todo2Id);
      expect(todoIds).not.toContain(todo3Id);
    });
  });

  it("should return empty array for tag with no todos", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const tagId = await createTestTag(client, tenantId, { name: "Empty Tag" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.tags.getTodos({ tagId });

      expect(result).toHaveLength(0);
    });
  });

  it("should fail for non-existent tag", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(
        caller.tags.getTodos({ tagId: "00000000-0000-0000-0000-000000000000" })
      ).rejects.toThrow("Tag not found");
    });
  });
});

describe("Tags Router - Validation and Edge Cases", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should reject duplicate tag names", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      await createTestTag(client, tenantId, { name: "Duplicate" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(
        caller.tags.create({ name: "Duplicate" })
      ).rejects.toThrow("A tag with this name already exists");
    });
  });

  it("should reject update with duplicate name", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const tag1Id = await createTestTag(client, tenantId, { name: "Tag1" });
      await createTestTag(client, tenantId, { name: "Tag2" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(
        caller.tags.update({ id: tag1Id, data: { name: "Tag2" } })
      ).rejects.toThrow("A tag with this name already exists");
    });
  });

  it("should reject update with no fields", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const tagId = await createTestTag(client, tenantId, { name: "Tag" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(
        caller.tags.update({ id: tagId, data: {} })
      ).rejects.toThrow("No fields to update");
    });
  });

  it("should return tags sorted by name", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      await createTestTag(client, tenantId, { name: "Zebra" });
      await createTestTag(client, tenantId, { name: "Alpha" });
      await createTestTag(client, tenantId, { name: "Middle" });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.tags.list();

      expect(result[0].name).toBe("Alpha");
      expect(result[1].name).toBe("Middle");
      expect(result[2].name).toBe("Zebra");
    });
  });

  it("should create tag with null color", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.tags.create({ name: "No Color Tag" });

      expect(result.name).toBe("No Color Tag");
      expect(result.color).toBeNull();
    });
  });

  it("should delete tag and cascade to todo_tags", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      const tagId = await createTestTag(client, tenantId, { name: "Tag to delete" });
      const todoId = await createTestTodo(client, tenantId, { title: "Todo" });
      await addTagToTodo(client, tenantId, todoId, tagId);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      // Delete tag
      await caller.tags.delete({ id: tagId });

      // Verify todo still exists but without the tag
      const todo = await caller.todos.get({ id: todoId });
      expect(todo.id).toBe(todoId);
      expect(todo.tags).toHaveLength(0);
    });
  });
});

describe("Tags Router - Error Cases", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should require authentication for all endpoints", async () => {
    const caller = createPublicCaller();

    await expect(caller.tags.list()).rejects.toThrow();
    await expect(caller.tags.get({ id: "00000000-0000-0000-0000-000000000000" })).rejects.toThrow();
    await expect(caller.tags.create({ name: "Test" })).rejects.toThrow();
  });

  it("should return NOT_FOUND for non-existent tag", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE session_token = $1", [sessionToken]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(
        caller.tags.get({ id: "00000000-0000-0000-0000-000000000000" })
      ).rejects.toThrow("Tag not found");
    });
  });
});
