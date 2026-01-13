import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, userProcedure } from "../init";
import { withTenantContext, withTenantTransaction, pool } from "@/server/db";
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoQuerySchema,
  AssignTodoSchema,
  UnassignTodoSchema,
  AssignedToMeQuerySchema,
  type Todo,
  type Tag,
  type PaginatedResult,
  type TodoAssignee,
  type TodoWithOrganization,
} from "@/shared/types";

export const todosRouter = router({
  list: userProcedure
    .input(TodoQuerySchema)
    .query(async ({ ctx, input }): Promise<PaginatedResult<Todo>> => {
      const tenantId = ctx.tenant!.id;
      const currentUserId = ctx.user!.id;

      return withTenantContext(tenantId, async (client) => {
        const conditions: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (input.status) {
          conditions.push(`t.status = $${idx++}`);
          values.push(input.status);
        }
        if (input.priority) {
          conditions.push(`t.priority = $${idx++}`);
          values.push(input.priority);
        }
        if (input.due_before) {
          conditions.push(`t.due_date <= $${idx++}`);
          values.push(input.due_before);
        }
        if (input.due_after) {
          conditions.push(`t.due_date >= $${idx++}`);
          values.push(input.due_after);
        }
        if (input.search) {
          conditions.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx})`);
          values.push(`%${input.search}%`);
          idx++;
        }

        // Handle assignedTo filter
        if (input.assignedTo) {
          if (input.assignedTo === "me") {
            conditions.push(`EXISTS (SELECT 1 FROM todo_assignments ta WHERE ta.todo_id = t.id AND ta.user_id = $${idx++})`);
            values.push(currentUserId);
          } else if (input.assignedTo === "unassigned") {
            conditions.push(`NOT EXISTS (SELECT 1 FROM todo_assignments ta WHERE ta.todo_id = t.id)`);
          } else {
            // Specific user ID
            conditions.push(`EXISTS (SELECT 1 FROM todo_assignments ta WHERE ta.todo_id = t.id AND ta.user_id = $${idx++})`);
            values.push(input.assignedTo);
          }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const countResult = await client.query(
          `SELECT COUNT(*) as total FROM todos t ${whereClause}`,
          values
        );
        const total = Number(countResult.rows[0]?.total || 0);

        const limit = input.limit;
        const offset = (input.page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        values.push(limit, offset);
        const { rows: todos } = await client.query<Todo>(
          `SELECT t.* FROM todos t ${whereClause} ORDER BY t.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
          values
        );

        if (todos.length > 0) {
          const todoIds = todos.map((t) => t.id);

          // Fetch tags
          const { rows: todoTags } = await client.query<{
            todo_id: string;
            id: string;
            tenant_id: string;
            name: string;
            color: string | null;
            created_at: Date;
          }>(
            `SELECT tt.todo_id, tg.id, tg.tenant_id, tg.name, tg.color, tg.created_at
             FROM todo_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.todo_id = ANY($1)`,
            [todoIds]
          );

          const tagsByTodo = new Map<string, Tag[]>();
          for (const tt of todoTags) {
            const tags = tagsByTodo.get(tt.todo_id) || [];
            tags.push({
              id: tt.id,
              tenant_id: tt.tenant_id,
              name: tt.name,
              color: tt.color,
              created_at: tt.created_at,
            });
            tagsByTodo.set(tt.todo_id, tags);
          }

          // Fetch assignees
          const { rows: todoAssignees } = await client.query<{
            todo_id: string;
            id: string;
            email: string;
            username: string;
            assigned_by: string;
            assigned_at: Date;
          }>(
            `SELECT ta.todo_id, u.id, u.email, u.username, ta.assigned_by, ta.assigned_at
             FROM todo_assignments ta
             JOIN users u ON u.id = ta.user_id
             WHERE ta.todo_id = ANY($1)`,
            [todoIds]
          );

          const assigneesByTodo = new Map<string, TodoAssignee[]>();
          for (const ta of todoAssignees) {
            const assignees = assigneesByTodo.get(ta.todo_id) || [];
            assignees.push({
              id: ta.id,
              email: ta.email,
              username: ta.username,
              assigned_by: ta.assigned_by,
              assigned_at: ta.assigned_at,
            });
            assigneesByTodo.set(ta.todo_id, assignees);
          }

          for (const todo of todos) {
            todo.tags = tagsByTodo.get(todo.id) || [];
            todo.assignees = assigneesByTodo.get(todo.id) || [];
            todo.assigned_to_me = todo.assignees.some((a) => a.id === currentUserId);
          }
        }

        return {
          data: todos,
          pagination: { page: input.page, limit, total, total_pages: totalPages },
        };
      });
    }),

  get: userProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const currentUserId = ctx.user!.id;

    return withTenantContext(ctx.tenant!.id, async (client) => {
      const { rows } = await client.query<Todo>("SELECT * FROM todos WHERE id = $1", [input.id]);
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
      }

      const { rows: tags } = await client.query<Tag>(
        "SELECT tg.* FROM todo_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.todo_id = $1",
        [input.id]
      );
      rows[0]!.tags = tags;

      // Fetch assignees with full information
      const { rows: assignees } = await client.query<TodoAssignee>(
        `SELECT u.id, u.email, u.username, ta.assigned_by, ta.assigned_at
         FROM todo_assignments ta
         JOIN users u ON u.id = ta.user_id
         WHERE ta.todo_id = $1`,
        [input.id]
      );
      rows[0]!.assignees = assignees;
      rows[0]!.assigned_to_me = assignees.some((a) => a.id === currentUserId);

      return rows[0]!;
    });
  }),

  create: userProcedure.input(CreateTodoSchema).mutation(async ({ ctx, input }) => {
    const tenantId = ctx.tenant!.id;

    return withTenantTransaction(tenantId, async (client) => {
      const { rows } = await client.query<Todo>(
        `INSERT INTO todos (tenant_id, title, description, status, priority, due_date)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          tenantId,
          input.title,
          input.description || null,
          input.status,
          input.priority,
          input.due_date || null,
        ]
      );
      const todo = rows[0]!;

      if (input.tag_ids && input.tag_ids.length > 0) {
        const { rows: validTags } = await client.query("SELECT id FROM tags WHERE id = ANY($1)", [
          input.tag_ids,
        ]);
        if (validTags.length !== input.tag_ids.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "One or more tags not found" });
        }

        for (const tagId of input.tag_ids) {
          await client.query("INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)", [
            todo.id,
            tagId,
          ]);
        }

        const { rows: tags } = await client.query<Tag>("SELECT * FROM tags WHERE id = ANY($1)", [
          input.tag_ids,
        ]);
        todo.tags = tags;
      } else {
        todo.tags = [];
      }

      return todo;
    });
  }),

  update: userProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateTodoSchema }))
    .mutation(async ({ ctx, input }) => {
      return withTenantTransaction(ctx.tenant!.id, async (client) => {
        const { rows: existing } = await client.query("SELECT id FROM todos WHERE id = $1", [
          input.id,
        ]);
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
        }

        const d = input.data;
        const updates: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (d.title !== undefined) {
          updates.push(`title = $${idx++}`);
          values.push(d.title);
        }
        if (d.description !== undefined) {
          updates.push(`description = $${idx++}`);
          values.push(d.description);
        }
        if (d.status !== undefined) {
          updates.push(`status = $${idx++}`);
          values.push(d.status);
        }
        if (d.priority !== undefined) {
          updates.push(`priority = $${idx++}`);
          values.push(d.priority);
        }
        if (d.due_date !== undefined) {
          updates.push(`due_date = $${idx++}`);
          values.push(d.due_date);
        }

        if (updates.length > 0) {
          values.push(input.id);
          await client.query(`UPDATE todos SET ${updates.join(", ")} WHERE id = $${idx}`, values);
        }

        if (d.tag_ids !== undefined) {
          await client.query("DELETE FROM todo_tags WHERE todo_id = $1", [input.id]);
          if (d.tag_ids.length > 0) {
            const { rows: validTags } = await client.query(
              "SELECT id FROM tags WHERE id = ANY($1)",
              [d.tag_ids]
            );
            if (validTags.length !== d.tag_ids.length) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "One or more tags not found" });
            }
            for (const tagId of d.tag_ids) {
              await client.query("INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)", [
                input.id,
                tagId,
              ]);
            }
          }
        }

        const { rows } = await client.query<Todo>("SELECT * FROM todos WHERE id = $1", [input.id]);
        const { rows: tags } = await client.query<Tag>(
          "SELECT tg.* FROM todo_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.todo_id = $1",
          [input.id]
        );
        rows[0]!.tags = tags;

        return rows[0]!;
      });
    }),

  delete: userProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withTenantContext(ctx.tenant!.id, async (client) => {
        const { rowCount } = await client.query("DELETE FROM todos WHERE id = $1", [input.id]);
        if (rowCount === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
        }
        return { success: true };
      });
    }),

  addTag: userProcedure
    .input(z.object({ todoId: z.string().uuid(), tagId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withTenantContext(ctx.tenant!.id, async (client) => {
        const { rows: todoRows } = await client.query("SELECT id FROM todos WHERE id = $1", [
          input.todoId,
        ]);
        if (todoRows.length === 0)
          throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });

        const { rows: tagRows } = await client.query("SELECT id FROM tags WHERE id = $1", [
          input.tagId,
        ]);
        if (tagRows.length === 0)
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });

        await client.query(
          "INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [input.todoId, input.tagId]
        );
        return { success: true };
      });
    }),

  removeTag: userProcedure
    .input(z.object({ todoId: z.string().uuid(), tagId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withTenantContext(ctx.tenant!.id, async (client) => {
        const { rowCount } = await client.query(
          "DELETE FROM todo_tags WHERE todo_id = $1 AND tag_id = $2",
          [input.todoId, input.tagId]
        );
        if (rowCount === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not attached to todo" });
        }
        return { success: true };
      });
    }),

  assign: userProcedure
    .input(AssignTodoSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenant!.id;
      const currentUserId = ctx.user!.id;

      return withTenantTransaction(tenantId, async (client) => {
        // Validate todo exists and belongs to current organization
        const { rows: todoRows } = await client.query<Todo>(
          "SELECT * FROM todos WHERE id = $1",
          [input.todoId]
        );
        if (todoRows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
        }

        // Validate all user IDs are members of the todo's organization
        const { rows: memberRows } = await client.query<{ user_id: string }>(
          "SELECT user_id FROM user_tenants WHERE tenant_id = $1 AND user_id = ANY($2)",
          [tenantId, input.userIds]
        );

        if (memberRows.length !== input.userIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more users are not members of this organization",
          });
        }

        // Create todo_assignments records for each user, preventing duplicates
        for (const userId of input.userIds) {
          await client.query(
            `INSERT INTO todo_assignments (todo_id, user_id, assigned_by)
             VALUES ($1, $2, $3)
             ON CONFLICT (todo_id, user_id) DO NOTHING`,
            [input.todoId, userId, currentUserId]
          );
        }

        // Return updated todo with full assignee information
        const { rows: assigneeRows } = await client.query<TodoAssignee>(
          `SELECT u.id, u.email, u.username, ta.assigned_by, ta.assigned_at
           FROM todo_assignments ta
           JOIN users u ON u.id = ta.user_id
           WHERE ta.todo_id = $1`,
          [input.todoId]
        );

        const todo = todoRows[0]!;
        todo.assignees = assigneeRows;
        todo.tags = [];

        // Load tags if any
        const { rows: tags } = await client.query<Tag>(
          "SELECT tg.* FROM todo_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.todo_id = $1",
          [input.todoId]
        );
        todo.tags = tags;

        return todo;
      });
    }),

  unassign: userProcedure
    .input(UnassignTodoSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenant!.id;
      const currentUserId = ctx.user!.id;

      return withTenantTransaction(tenantId, async (client) => {
        // Validate todo exists
        const { rows: todoRows } = await client.query<Todo>(
          "SELECT * FROM todos WHERE id = $1",
          [input.todoId]
        );
        if (todoRows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
        }

        // Check permissions: can unassign self OR if you're the assigner OR if you're the todo creator
        const { rows: assignmentRows } = await client.query<{ assigned_by: string }>(
          "SELECT assigned_by FROM todo_assignments WHERE todo_id = $1 AND user_id = $2",
          [input.todoId, input.userId]
        );

        if (assignmentRows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
        }

        const assignment = assignmentRows[0]!;
        const todo = todoRows[0]!;
        const canUnassign =
          input.userId === currentUserId || // Can unassign self
          assignment.assigned_by === currentUserId || // Can unassign if you assigned them
          todo.tenant_id === tenantId; // Todo creator (implied by tenant context)

        if (!canUnassign) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to unassign this user",
          });
        }

        // Delete todo_assignments record
        await client.query(
          "DELETE FROM todo_assignments WHERE todo_id = $1 AND user_id = $2",
          [input.todoId, input.userId]
        );

        // Return updated todo with remaining assignees
        const { rows: assigneeRows } = await client.query<TodoAssignee>(
          `SELECT u.id, u.email, u.username, ta.assigned_by, ta.assigned_at
           FROM todo_assignments ta
           JOIN users u ON u.id = ta.user_id
           WHERE ta.todo_id = $1`,
          [input.todoId]
        );

        const updatedTodo = todoRows[0]!;
        updatedTodo.assignees = assigneeRows;

        // Load tags
        const { rows: tags } = await client.query<Tag>(
          "SELECT tg.* FROM todo_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.todo_id = $1",
          [input.todoId]
        );
        updatedTodo.tags = tags;

        return updatedTodo;
      });
    }),

  getAssignedToMe: userProcedure
    .input(AssignedToMeQuerySchema)
    .query(async ({ ctx, input }): Promise<PaginatedResult<TodoWithOrganization>> => {
      const currentUserId = ctx.user!.id;

      // Use pool directly to query across all organizations
      const client = await pool.connect();
      try {
        // Build filter conditions
        const conditions: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        // Always filter by current user's assignments
        values.push(currentUserId);
        const userIdxParam = `$${idx++}`;

        if (input.status) {
          conditions.push(`t.status = $${idx++}`);
          values.push(input.status);
        }
        if (input.priority) {
          conditions.push(`t.priority = $${idx++}`);
          values.push(input.priority);
        }
        if (input.search) {
          conditions.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx})`);
          values.push(`%${input.search}%`);
          idx++;
        }

        const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

        // Get total count
        const countQuery = `
          SELECT COUNT(DISTINCT t.id) as total
          FROM todos t
          INNER JOIN todo_assignments ta ON ta.todo_id = t.id
          INNER JOIN tenants tn ON tn.id = t.tenant_id
          INNER JOIN user_tenants ut ON ut.tenant_id = tn.id AND ut.user_id = ${userIdxParam}
          WHERE ta.user_id = ${userIdxParam} ${whereClause}
        `;

        const countResult = await client.query(countQuery, values);
        const total = Number(countResult.rows[0]?.total || 0);

        const limit = input.limit;
        const offset = (input.page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        // Get todos with organization info
        // Order by: priority (high first), then due_date (soonest first, nulls last), then created_at (newest first)
        values.push(limit, offset);
        const todosQuery = `
          SELECT
            t.*,
            tn.id as org_id,
            tn.name as org_name,
            tn.slug as org_slug
          FROM todos t
          INNER JOIN todo_assignments ta ON ta.todo_id = t.id
          INNER JOIN tenants tn ON tn.id = t.tenant_id
          INNER JOIN user_tenants ut ON ut.tenant_id = tn.id AND ut.user_id = ${userIdxParam}
          WHERE ta.user_id = ${userIdxParam} ${whereClause}
          ORDER BY
            CASE t.priority
              WHEN 'high' THEN 1
              WHEN 'medium' THEN 2
              WHEN 'low' THEN 3
            END,
            t.due_date ASC NULLS LAST,
            t.created_at DESC
          LIMIT $${idx++} OFFSET $${idx}
        `;

        const { rows: todoRows } = await client.query<
          Todo & { org_id: string; org_name: string; org_slug: string }
        >(todosQuery, values);

        // Transform to TodoWithOrganization and fetch tags + assignees
        const todos: TodoWithOrganization[] = [];

        if (todoRows.length > 0) {
          const todoIds = todoRows.map((t) => t.id);

          // Fetch tags for all todos
          const { rows: todoTags } = await client.query<{
            todo_id: string;
            id: string;
            tenant_id: string;
            name: string;
            color: string | null;
            created_at: Date;
          }>(
            `SELECT tt.todo_id, tg.id, tg.tenant_id, tg.name, tg.color, tg.created_at
             FROM todo_tags tt
             JOIN tags tg ON tg.id = tt.tag_id
             WHERE tt.todo_id = ANY($1)`,
            [todoIds]
          );

          const tagsByTodo = new Map<string, Tag[]>();
          for (const tt of todoTags) {
            const tags = tagsByTodo.get(tt.todo_id) || [];
            tags.push({
              id: tt.id,
              tenant_id: tt.tenant_id,
              name: tt.name,
              color: tt.color,
              created_at: tt.created_at,
            });
            tagsByTodo.set(tt.todo_id, tags);
          }

          // Fetch assignees for all todos
          const { rows: todoAssignees } = await client.query<{
            todo_id: string;
            id: string;
            email: string;
            username: string;
            assigned_by: string;
            assigned_at: Date;
          }>(
            `SELECT ta.todo_id, u.id, u.email, u.username, ta.assigned_by, ta.assigned_at
             FROM todo_assignments ta
             JOIN users u ON u.id = ta.user_id
             WHERE ta.todo_id = ANY($1)`,
            [todoIds]
          );

          const assigneesByTodo = new Map<string, TodoAssignee[]>();
          for (const ta of todoAssignees) {
            const assignees = assigneesByTodo.get(ta.todo_id) || [];
            assignees.push({
              id: ta.id,
              email: ta.email,
              username: ta.username,
              assigned_by: ta.assigned_by,
              assigned_at: ta.assigned_at,
            });
            assigneesByTodo.set(ta.todo_id, assignees);
          }

          // Build final results
          for (const row of todoRows) {
            const todo: TodoWithOrganization = {
              id: row.id,
              tenant_id: row.tenant_id,
              title: row.title,
              description: row.description,
              status: row.status,
              priority: row.priority,
              due_date: row.due_date,
              created_at: row.created_at,
              updated_at: row.updated_at,
              tags: tagsByTodo.get(row.id) || [],
              assignees: assigneesByTodo.get(row.id) || [],
              assigned_to_me: true, // Always true since we're querying assigned to current user
              organization: {
                id: row.org_id,
                name: row.org_name,
                slug: row.org_slug,
              },
            };
            todos.push(todo);
          }
        }

        return {
          data: todos,
          pagination: { page: input.page, limit, total, total_pages: totalPages },
        };
      } finally {
        client.release();
      }
    }),
});
