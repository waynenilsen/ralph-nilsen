/**
 * Integration tests for the todos tRPC router.
 *
 * Tests verify all CRUD operations work with both session and API key
 * authentication, as well as filtering, search, pagination, and tag operations.
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
  createTestTodos,
  createTestTag,
  addTagToTodo,
} from "../../helpers";
import {
  createSessionCaller,
  createApiKeyCaller,
  createPublicCaller,
  createTestApiKeyObject,
} from "../../helpers/api";

describe("Todos Router - CRUD with Session Auth", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should list todos with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      // Create some todos
      await createTestTodos(client, tenantId, 3, { titlePrefix: "Test Todo" });

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

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
    });
  });

  it("should get a single todo with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const todoId = await createTestTodo(client, tenantId, { title: "My Test Todo" });

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

      const result = await caller.todos.get({ id: todoId });

      expect(result.id).toBe(todoId);
      expect(result.title).toBe("My Test Todo");
    });
  });

  it("should create a todo with session auth", async () => {
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
        title: "New Todo",
        description: "Test description",
        status: "pending",
        priority: "high",
      });

      expect(result.id).toBeDefined();
      expect(result.title).toBe("New Todo");
      expect(result.description).toBe("Test description");
      expect(result.status).toBe("pending");
      expect(result.priority).toBe("high");
      expect(result.tenant_id).toBe(tenantId);
    });
  });

  it("should update a todo with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const todoId = await createTestTodo(client, tenantId, { title: "Original Title" });

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

      const result = await caller.todos.update({
        id: todoId,
        data: {
          title: "Updated Title",
          status: "completed",
        },
      });

      expect(result.title).toBe("Updated Title");
      expect(result.status).toBe("completed");
    });
  });

  it("should delete a todo with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const todoId = await createTestTodo(client, tenantId, { title: "To Delete" });

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

      const result = await caller.todos.delete({ id: todoId });
      expect(result.success).toBe(true);

      // Verify todo is deleted
      await expect(caller.todos.get({ id: todoId })).rejects.toThrow("Todo not found");
    });
  });
});

describe("Todos Router - CRUD with API Key Auth", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should list todos with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);

      // Create some todos
      await createTestTodos(client, tenantId, 3, { titlePrefix: "API Test Todo" });

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

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
    });
  });

  it("should get a single todo with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);
      const todoId = await createTestTodo(client, tenantId, { title: "API Test Todo" });

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

      const result = await caller.todos.get({ id: todoId });

      expect(result.id).toBe(todoId);
      expect(result.title).toBe("API Test Todo");
    });
  });

  it("should create a todo with API key auth", async () => {
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
        title: "API Created Todo",
        status: "pending",
        priority: "low",
      });

      expect(result.id).toBeDefined();
      expect(result.title).toBe("API Created Todo");
      expect(result.tenant_id).toBe(tenantId);
    });
  });

  it("should update a todo with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);
      const todoId = await createTestTodo(client, tenantId, { title: "Original" });

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

      const result = await caller.todos.update({
        id: todoId,
        data: { title: "API Updated" },
      });

      expect(result.title).toBe("API Updated");
    });
  });

  it("should delete a todo with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);
      const todoId = await createTestTodo(client, tenantId, { title: "To Delete" });

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

      const result = await caller.todos.delete({ id: todoId });
      expect(result.success).toBe(true);
    });
  });
});

describe("Todos Router - Filtering", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should filter todos by status", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      await createTestTodos(client, tenantId, 3, { status: "pending" });
      await createTestTodos(client, tenantId, 2, { status: "completed" });

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

      const pendingResult = await caller.todos.list({ status: "pending" });
      expect(pendingResult.data).toHaveLength(3);
      pendingResult.data.forEach((todo) => expect(todo.status).toBe("pending"));

      const completedResult = await caller.todos.list({ status: "completed" });
      expect(completedResult.data).toHaveLength(2);
      completedResult.data.forEach((todo) => expect(todo.status).toBe("completed"));
    });
  });

  it("should filter todos by priority", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      await createTestTodos(client, tenantId, 2, { priority: "high" });
      await createTestTodos(client, tenantId, 3, { priority: "medium" });
      await createTestTodos(client, tenantId, 1, { priority: "low" });

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

      const highResult = await caller.todos.list({ priority: "high" });
      expect(highResult.data).toHaveLength(2);
      highResult.data.forEach((todo) => expect(todo.priority).toBe("high"));

      const lowResult = await caller.todos.list({ priority: "low" });
      expect(lowResult.data).toHaveLength(1);
    });
  });

  it("should filter todos by due date", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      await createTestTodo(client, tenantId, { title: "Due Today", dueDate: today });
      await createTestTodo(client, tenantId, { title: "Due Tomorrow", dueDate: tomorrow });
      await createTestTodo(client, tenantId, { title: "Due Next Week", dueDate: nextWeek });

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

      // Filter by due_before
      const dueSoon = await caller.todos.list({ due_before: tomorrow.toISOString() });
      expect(dueSoon.data.length).toBeGreaterThanOrEqual(1);

      // Filter by due_after
      const dueLater = await caller.todos.list({ due_after: tomorrow.toISOString() });
      expect(dueLater.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("Todos Router - Search", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should search todos by title", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      await createTestTodo(client, tenantId, { title: "Buy groceries" });
      await createTestTodo(client, tenantId, { title: "Buy tickets" });
      await createTestTodo(client, tenantId, { title: "Clean house" });

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

      const result = await caller.todos.list({ search: "Buy" });

      expect(result.data).toHaveLength(2);
      result.data.forEach((todo) => expect(todo.title.toLowerCase()).toContain("buy"));
    });
  });

  it("should search todos by description", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      await createTestTodo(client, tenantId, {
        title: "Task 1",
        description: "Important project deadline",
      });
      await createTestTodo(client, tenantId, {
        title: "Task 2",
        description: "Regular weekly task",
      });
      await createTestTodo(client, tenantId, {
        title: "Task 3",
        description: "Another project task",
      });

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

      const result = await caller.todos.list({ search: "project" });

      expect(result.data).toHaveLength(2);
    });
  });

  it("should be case-insensitive search", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      await createTestTodo(client, tenantId, { title: "UPPERCASE TODO" });
      await createTestTodo(client, tenantId, { title: "lowercase todo" });
      await createTestTodo(client, tenantId, { title: "MixedCase Todo" });

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

      const result = await caller.todos.list({ search: "TODO" });

      expect(result.data).toHaveLength(3);
    });
  });
});

describe("Todos Router - Pagination", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should paginate todos correctly", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      // Create 15 todos
      await createTestTodos(client, tenantId, 15, { titlePrefix: "Paginated Todo" });

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

      // First page
      const page1 = await caller.todos.list({ page: 1, limit: 5 });
      expect(page1.data).toHaveLength(5);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.limit).toBe(5);
      expect(page1.pagination.total).toBe(15);
      expect(page1.pagination.total_pages).toBe(3);

      // Second page
      const page2 = await caller.todos.list({ page: 2, limit: 5 });
      expect(page2.data).toHaveLength(5);
      expect(page2.pagination.page).toBe(2);

      // Third page
      const page3 = await caller.todos.list({ page: 3, limit: 5 });
      expect(page3.data).toHaveLength(5);
      expect(page3.pagination.page).toBe(3);

      // Pages should have different todos
      const page1Ids = page1.data.map((t) => t.id);
      const page2Ids = page2.data.map((t) => t.id);
      const page3Ids = page3.data.map((t) => t.id);

      expect(page1Ids).not.toEqual(page2Ids);
      expect(page2Ids).not.toEqual(page3Ids);
    });
  });

  it("should use default pagination values", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      await createTestTodos(client, tenantId, 5);

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

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBeGreaterThan(0);
    });
  });
});

describe("Todos Router - Tag Operations", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should add tag to todo", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const todoId = await createTestTodo(client, tenantId, { title: "Todo with tag" });
      const tagId = await createTestTag(client, tenantId, { name: "Important" });

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

      const result = await caller.todos.addTag({ todoId, tagId });
      expect(result.success).toBe(true);

      // Verify tag is attached
      const todo = await caller.todos.get({ id: todoId });
      expect(todo.tags).toHaveLength(1);
      expect(todo.tags![0].id).toBe(tagId);
    });
  });

  it("should remove tag from todo", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const todoId = await createTestTodo(client, tenantId, { title: "Todo with tag" });
      const tagId = await createTestTag(client, tenantId, { name: "Important" });
      await addTagToTodo(client, tenantId, todoId, tagId);

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

      const result = await caller.todos.removeTag({ todoId, tagId });
      expect(result.success).toBe(true);

      // Verify tag is removed
      const todo = await caller.todos.get({ id: todoId });
      expect(todo.tags).toHaveLength(0);
    });
  });

  it("should create todo with tags", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const tag1Id = await createTestTag(client, tenantId, { name: "Tag1" });
      const tag2Id = await createTestTag(client, tenantId, { name: "Tag2" });

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
        title: "Todo with multiple tags",
        status: "pending",
        priority: "medium",
        tag_ids: [tag1Id, tag2Id],
      });

      expect(result.tags).toHaveLength(2);
      const tagIds = result.tags!.map((t) => t.id);
      expect(tagIds).toContain(tag1Id);
      expect(tagIds).toContain(tag2Id);
    });
  });

  it("should update todo tags", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const todoId = await createTestTodo(client, tenantId, { title: "Todo" });
      const tag1Id = await createTestTag(client, tenantId, { name: "Tag1" });
      const tag2Id = await createTestTag(client, tenantId, { name: "Tag2" });
      const tag3Id = await createTestTag(client, tenantId, { name: "Tag3" });

      await addTagToTodo(client, tenantId, todoId, tag1Id);

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

      // Replace all tags
      const result = await caller.todos.update({
        id: todoId,
        data: { tag_ids: [tag2Id, tag3Id] },
      });

      expect(result.tags).toHaveLength(2);
      const tagIds = result.tags!.map((t) => t.id);
      expect(tagIds).not.toContain(tag1Id);
      expect(tagIds).toContain(tag2Id);
      expect(tagIds).toContain(tag3Id);
    });
  });

  it("should fail when adding non-existent tag", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const todoId = await createTestTodo(client, tenantId, { title: "Todo" });

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
        caller.todos.addTag({
          todoId,
          tagId: "00000000-0000-0000-0000-000000000000",
        })
      ).rejects.toThrow("Tag not found");
    });
  });

  it("should include tags when listing todos", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);
      const todoId = await createTestTodo(client, tenantId, { title: "Todo with tag" });
      const tagId = await createTestTag(client, tenantId, { name: "Listed Tag" });
      await addTagToTodo(client, tenantId, todoId, tagId);

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

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags).toHaveLength(1);
      expect(result.data[0].tags![0].name).toBe("Listed Tag");
    });
  });
});

describe("Todos Router - Error Cases", () => {
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

    await expect(caller.todos.list({})).rejects.toThrow();
    await expect(
      caller.todos.get({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow();
    await expect(
      caller.todos.create({ title: "Test", status: "pending", priority: "medium" })
    ).rejects.toThrow();
  });

  it("should return NOT_FOUND for non-existent todo", async () => {
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
        caller.todos.get({ id: "00000000-0000-0000-0000-000000000000" })
      ).rejects.toThrow("Todo not found");
    });
  });

  it("should validate input for create", async () => {
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

      // Invalid status
      await expect(
        caller.todos.create({
          title: "Test",
          status: "invalid" as "pending",
          priority: "medium",
        })
      ).rejects.toThrow();

      // Invalid priority
      await expect(
        caller.todos.create({
          title: "Test",
          status: "pending",
          priority: "invalid" as "medium",
        })
      ).rejects.toThrow();
    });
  });
});
