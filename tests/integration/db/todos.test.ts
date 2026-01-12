/**
 * Integration tests for todo database operations.
 *
 * Tests CRUD operations, RLS enforcement, pagination, filtering, and search.
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
  setTenantContext,
  resetTenantContext,
  recordExists,
} from "../../helpers";

describe("Todo Database Operations", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("Create Todo", () => {
    it("should create a todo with required fields", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-create-todo-${Date.now()}`);

        const todoId = await createTestTodo(client, tenantId, {
          title: "Test Todo",
        });

        expect(todoId).toBeDefined();

        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT * FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe("Test Todo");
        expect(rows[0].tenant_id).toBe(tenantId);
        expect(rows[0].status).toBe("pending");
        expect(rows[0].priority).toBe("medium");
        expect(rows[0].description).toBeNull();
        expect(rows[0].due_date).toBeNull();
        expect(rows[0].created_at).toBeInstanceOf(Date);
      });
    });

    it("should create a todo with all optional fields", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-full-todo-${Date.now()}`);
        const dueDate = new Date("2025-12-31");

        const todoId = await createTestTodo(client, tenantId, {
          title: "Full Todo",
          description: "A complete todo with all fields",
          status: "completed",
          priority: "high",
          dueDate,
        });

        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT * FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rows[0].title).toBe("Full Todo");
        expect(rows[0].description).toBe("A complete todo with all fields");
        expect(rows[0].status).toBe("completed");
        expect(rows[0].priority).toBe("high");
        expect(rows[0].due_date).toBeInstanceOf(Date);
      });
    });

    it("should enforce status check constraint", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-status-check-${Date.now()}`);

        await setTenantContext(client, tenantId);
        await expect(
          client.query("INSERT INTO todos (tenant_id, title, status) VALUES ($1, $2, $3)", [
            tenantId,
            "Invalid Status",
            "invalid",
          ])
        ).rejects.toThrow();
        await resetTenantContext(client);
      });
    });

    it("should enforce priority check constraint", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-priority-check-${Date.now()}`);

        await setTenantContext(client, tenantId);
        await expect(
          client.query("INSERT INTO todos (tenant_id, title, priority) VALUES ($1, $2, $3)", [
            tenantId,
            "Invalid Priority",
            "critical",
          ])
        ).rejects.toThrow();
        await resetTenantContext(client);
      });
    });
  });

  describe("Read Todo (with RLS)", () => {
    it("should read todo by ID within tenant context", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-read-todo-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Readable Todo" });

        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT * FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe("Readable Todo");
      });
    });

    it("should not read todo from different tenant", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-read-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-read-b-${Date.now()}`);

        const todoId = await createTestTodo(client, tenantAId, { title: "Tenant A Todo" });

        // Try to read from tenant B's context
        await setTenantContext(client, tenantBId);
        const { rows } = await client.query("SELECT * FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rows).toHaveLength(0);
      });
    });

    it("should return empty without tenant context", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-no-context-${Date.now()}`);
        await createTestTodo(client, tenantId, { title: "No Context Todo" });

        // No tenant context set
        const { rows } = await client.query("SELECT * FROM todos");
        expect(rows).toHaveLength(0);
      });
    });
  });

  describe("Update Todo", () => {
    it("should update todo title", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-update-title-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { title: "Original" });

        await setTenantContext(client, tenantId);
        await client.query("UPDATE todos SET title = $1 WHERE id = $2", ["Updated", todoId]);

        const { rows } = await client.query("SELECT title FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rows[0].title).toBe("Updated");
      });
    });

    it("should update todo status", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-update-status-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId, { status: "pending" });

        await setTenantContext(client, tenantId);
        await client.query("UPDATE todos SET status = $1 WHERE id = $2", ["completed", todoId]);

        const { rows } = await client.query("SELECT status FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rows[0].status).toBe("completed");
      });
    });

    it("should auto-update updated_at on update", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-updated-at-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId);

        await setTenantContext(client, tenantId);
        const { rows: before } = await client.query("SELECT updated_at FROM todos WHERE id = $1", [
          todoId,
        ]);

        await new Promise((resolve) => setTimeout(resolve, 10));

        await client.query("UPDATE todos SET title = $1 WHERE id = $2", ["Changed", todoId]);

        const { rows: after } = await client.query("SELECT updated_at FROM todos WHERE id = $1", [
          todoId,
        ]);
        await resetTenantContext(client);

        expect(after[0].updated_at.getTime()).toBeGreaterThan(before[0].updated_at.getTime());
      });
    });

    it("should not update todo from different tenant", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-cross-update-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-cross-update-b-${Date.now()}`);

        const todoId = await createTestTodo(client, tenantAId, { title: "Tenant A Todo" });

        // Try to update from tenant B's context
        await setTenantContext(client, tenantBId);
        const { rowCount } = await client.query("UPDATE todos SET title = $1 WHERE id = $2", [
          "Hacked!",
          todoId,
        ]);
        await resetTenantContext(client);

        expect(rowCount).toBe(0);

        // Verify original is unchanged
        await setTenantContext(client, tenantAId);
        const { rows } = await client.query("SELECT title FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rows[0].title).toBe("Tenant A Todo");
      });
    });
  });

  describe("Delete Todo", () => {
    it("should delete todo by ID", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-delete-${Date.now()}`);
        const todoId = await createTestTodo(client, tenantId);

        await setTenantContext(client, tenantId);
        await client.query("DELETE FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(await recordExists(client, "todos", todoId)).toBe(false);
      });
    });

    it("should not delete todo from different tenant", async () => {
      await withTestClient(async (client) => {
        const tenantAId = await createTestTenant(client, `test-cross-delete-a-${Date.now()}`);
        const tenantBId = await createTestTenant(client, `test-cross-delete-b-${Date.now()}`);

        const todoId = await createTestTodo(client, tenantAId, { title: "Tenant A Todo" });

        // Try to delete from tenant B's context
        await setTenantContext(client, tenantBId);
        const { rowCount } = await client.query("DELETE FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rowCount).toBe(0);

        // Verify original still exists
        await setTenantContext(client, tenantAId);
        const { rows } = await client.query("SELECT * FROM todos WHERE id = $1", [todoId]);
        await resetTenantContext(client);

        expect(rows).toHaveLength(1);
      });
    });
  });

  describe("List Todos with Pagination", () => {
    it("should list all todos for tenant", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-list-${Date.now()}`);
        await createTestTodos(client, tenantId, 5);

        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT * FROM todos ORDER BY created_at");
        await resetTenantContext(client);

        expect(rows).toHaveLength(5);
      });
    });

    it("should paginate todos with LIMIT and OFFSET", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-paginate-${Date.now()}`);
        await createTestTodos(client, tenantId, 10, { titlePrefix: "Paginated Todo" });

        await setTenantContext(client, tenantId);

        // First page
        const { rows: page1 } = await client.query(
          "SELECT * FROM todos ORDER BY created_at LIMIT 3 OFFSET 0"
        );
        expect(page1).toHaveLength(3);

        // Second page
        const { rows: page2 } = await client.query(
          "SELECT * FROM todos ORDER BY created_at LIMIT 3 OFFSET 3"
        );
        expect(page2).toHaveLength(3);

        // Last page (partial)
        const { rows: lastPage } = await client.query(
          "SELECT * FROM todos ORDER BY created_at LIMIT 3 OFFSET 9"
        );
        expect(lastPage).toHaveLength(1);

        await resetTenantContext(client);
      });
    });

    it("should count total todos for pagination", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-count-${Date.now()}`);
        await createTestTodos(client, tenantId, 15);

        await setTenantContext(client, tenantId);
        const { rows } = await client.query("SELECT COUNT(*) as total FROM todos");
        await resetTenantContext(client);

        expect(parseInt(rows[0].total)).toBe(15);
      });
    });
  });

  describe("Filter Todos", () => {
    describe("Filter by Status", () => {
      it("should filter by pending status", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-filter-pending-${Date.now()}`);
          await createTestTodos(client, tenantId, 3, { status: "pending" });
          await createTestTodos(client, tenantId, 2, { status: "completed" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE status = $1", ["pending"]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(3);
        });
      });

      it("should filter by completed status", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-filter-completed-${Date.now()}`);
          await createTestTodos(client, tenantId, 3, { status: "pending" });
          await createTestTodos(client, tenantId, 2, { status: "completed" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE status = $1", [
            "completed",
          ]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(2);
        });
      });
    });

    describe("Filter by Priority", () => {
      it("should filter by low priority", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-filter-low-${Date.now()}`);
          await createTestTodos(client, tenantId, 2, { priority: "low" });
          await createTestTodos(client, tenantId, 3, { priority: "medium" });
          await createTestTodos(client, tenantId, 1, { priority: "high" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE priority = $1", ["low"]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(2);
        });
      });

      it("should filter by high priority", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-filter-high-${Date.now()}`);
          await createTestTodos(client, tenantId, 2, { priority: "low" });
          await createTestTodos(client, tenantId, 3, { priority: "medium" });
          await createTestTodos(client, tenantId, 4, { priority: "high" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE priority = $1", ["high"]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(4);
        });
      });
    });

    describe("Filter by Due Date", () => {
      it("should filter todos due before a date", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-filter-due-before-${Date.now()}`);
          const pastDate = new Date("2024-01-01");
          const futureDate = new Date("2026-01-01");

          await createTestTodo(client, tenantId, { title: "Past", dueDate: pastDate });
          await createTestTodo(client, tenantId, { title: "Future", dueDate: futureDate });
          await createTestTodo(client, tenantId, { title: "No Due Date" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE due_date < $1", [
            new Date("2025-01-01"),
          ]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(1);
          expect(rows[0].title).toBe("Past");
        });
      });

      it("should filter todos due after a date", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-filter-due-after-${Date.now()}`);
          const pastDate = new Date("2024-01-01");
          const futureDate = new Date("2026-01-01");

          await createTestTodo(client, tenantId, { title: "Past", dueDate: pastDate });
          await createTestTodo(client, tenantId, { title: "Future", dueDate: futureDate });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE due_date > $1", [
            new Date("2025-01-01"),
          ]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(1);
          expect(rows[0].title).toBe("Future");
        });
      });

      it("should filter todos without due date", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-filter-no-due-${Date.now()}`);

          await createTestTodo(client, tenantId, { title: "With Due", dueDate: new Date() });
          await createTestTodo(client, tenantId, { title: "No Due 1" });
          await createTestTodo(client, tenantId, { title: "No Due 2" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE due_date IS NULL");
          await resetTenantContext(client);

          expect(rows).toHaveLength(2);
        });
      });
    });

    describe("Combined Filters", () => {
      it("should filter by status and priority", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-filter-combined-${Date.now()}`);

          await createTestTodo(client, tenantId, { status: "pending", priority: "high" });
          await createTestTodo(client, tenantId, { status: "pending", priority: "low" });
          await createTestTodo(client, tenantId, { status: "completed", priority: "high" });
          await createTestTodo(client, tenantId, { status: "completed", priority: "low" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query(
            "SELECT * FROM todos WHERE status = $1 AND priority = $2",
            ["pending", "high"]
          );
          await resetTenantContext(client);

          expect(rows).toHaveLength(1);
        });
      });
    });
  });

  describe("Search Todos", () => {
    describe("Search by Title", () => {
      it("should search by exact title match", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-search-exact-${Date.now()}`);

          await createTestTodo(client, tenantId, { title: "Buy groceries" });
          await createTestTodo(client, tenantId, { title: "Clean house" });
          await createTestTodo(client, tenantId, { title: "Call mom" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE title = $1", [
            "Buy groceries",
          ]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(1);
        });
      });

      it("should search by partial title with ILIKE", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-search-partial-${Date.now()}`);

          await createTestTodo(client, tenantId, { title: "Buy groceries" });
          await createTestTodo(client, tenantId, { title: "Buy new shoes" });
          await createTestTodo(client, tenantId, { title: "Clean house" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE title ILIKE $1", [
            "%buy%",
          ]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(2);
        });
      });

      it("should search case-insensitively with ILIKE", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-search-case-${Date.now()}`);

          await createTestTodo(client, tenantId, { title: "IMPORTANT TASK" });
          await createTestTodo(client, tenantId, { title: "important meeting" });
          await createTestTodo(client, tenantId, { title: "Other task" });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE title ILIKE $1", [
            "%important%",
          ]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(2);
        });
      });
    });

    describe("Search by Description", () => {
      it("should search by description content", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-search-desc-${Date.now()}`);

          await createTestTodo(client, tenantId, {
            title: "Todo 1",
            description: "This is an urgent task",
          });
          await createTestTodo(client, tenantId, {
            title: "Todo 2",
            description: "Normal priority task",
          });
          await createTestTodo(client, tenantId, {
            title: "Todo 3",
            description: "Another urgent item",
          });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query("SELECT * FROM todos WHERE description ILIKE $1", [
            "%urgent%",
          ]);
          await resetTenantContext(client);

          expect(rows).toHaveLength(2);
        });
      });
    });

    describe("Search by Title or Description", () => {
      it("should search across title and description", async () => {
        await withTestClient(async (client) => {
          const tenantId = await createTestTenant(client, `test-search-both-${Date.now()}`);

          await createTestTodo(client, tenantId, {
            title: "Meeting with team",
            description: "Discuss project status",
          });
          await createTestTodo(client, tenantId, {
            title: "Prepare report",
            description: "Meeting notes from last week",
          });
          await createTestTodo(client, tenantId, {
            title: "Other task",
            description: "Nothing related",
          });

          await setTenantContext(client, tenantId);
          const { rows } = await client.query(
            "SELECT * FROM todos WHERE title ILIKE $1 OR description ILIKE $1",
            ["%meeting%"]
          );
          await resetTenantContext(client);

          expect(rows).toHaveLength(2);
        });
      });
    });
  });
});
