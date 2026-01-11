import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, sessionProcedure } from "../init";
import { withTenantContext, withTenantTransaction } from "@/server/db";
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoQuerySchema,
  type Todo,
  type Tag,
  type PaginatedResult,
} from "@/shared/types";

export const todosRouter = router({
  list: sessionProcedure
    .input(TodoQuerySchema)
    .query(async ({ ctx, input }): Promise<PaginatedResult<Todo>> => {
      const tenantId = ctx.tenant!.id;

      return withTenantContext(tenantId, async (client) => {
        const conditions: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (input.status) {
          conditions.push(`status = $${idx++}`);
          values.push(input.status);
        }
        if (input.priority) {
          conditions.push(`priority = $${idx++}`);
          values.push(input.priority);
        }
        if (input.due_before) {
          conditions.push(`due_date <= $${idx++}`);
          values.push(input.due_before);
        }
        if (input.due_after) {
          conditions.push(`due_date >= $${idx++}`);
          values.push(input.due_after);
        }
        if (input.search) {
          conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
          values.push(`%${input.search}%`);
          idx++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const countResult = await client.query(`SELECT COUNT(*) as total FROM todos ${whereClause}`, values);
        const total = Number(countResult.rows[0]?.total || 0);

        const limit = input.limit;
        const offset = (input.page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        values.push(limit, offset);
        const { rows: todos } = await client.query<Todo>(
          `SELECT * FROM todos ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
          values
        );

        if (todos.length > 0) {
          const todoIds = todos.map((t) => t.id);
          const { rows: todoTags } = await client.query<{ todo_id: string; id: string; tenant_id: string; name: string; color: string | null; created_at: Date }>(
            `SELECT tt.todo_id, tg.id, tg.tenant_id, tg.name, tg.color, tg.created_at
             FROM todo_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.todo_id = ANY($1)`,
            [todoIds]
          );

          const tagsByTodo = new Map<string, Tag[]>();
          for (const tt of todoTags) {
            const tags = tagsByTodo.get(tt.todo_id) || [];
            tags.push({ id: tt.id, tenant_id: tt.tenant_id, name: tt.name, color: tt.color, created_at: tt.created_at });
            tagsByTodo.set(tt.todo_id, tags);
          }

          for (const todo of todos) {
            todo.tags = tagsByTodo.get(todo.id) || [];
          }
        }

        return { data: todos, pagination: { page: input.page, limit, total, total_pages: totalPages } };
      });
    }),

  get: sessionProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
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

        return rows[0]!;
      });
    }),

  create: sessionProcedure
    .input(CreateTodoSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenant!.id;

      return withTenantTransaction(tenantId, async (client) => {
        const { rows } = await client.query<Todo>(
          `INSERT INTO todos (tenant_id, title, description, status, priority, due_date)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [tenantId, input.title, input.description || null, input.status, input.priority, input.due_date || null]
        );
        const todo = rows[0]!;

        if (input.tag_ids && input.tag_ids.length > 0) {
          const { rows: validTags } = await client.query("SELECT id FROM tags WHERE id = ANY($1)", [input.tag_ids]);
          if (validTags.length !== input.tag_ids.length) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "One or more tags not found" });
          }

          for (const tagId of input.tag_ids) {
            await client.query("INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)", [todo.id, tagId]);
          }

          const { rows: tags } = await client.query<Tag>("SELECT * FROM tags WHERE id = ANY($1)", [input.tag_ids]);
          todo.tags = tags;
        } else {
          todo.tags = [];
        }

        return todo;
      });
    }),

  update: sessionProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateTodoSchema }))
    .mutation(async ({ ctx, input }) => {
      return withTenantTransaction(ctx.tenant!.id, async (client) => {
        const { rows: existing } = await client.query("SELECT id FROM todos WHERE id = $1", [input.id]);
        if (existing.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });
        }

        const d = input.data;
        const updates: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (d.title !== undefined) { updates.push(`title = $${idx++}`); values.push(d.title); }
        if (d.description !== undefined) { updates.push(`description = $${idx++}`); values.push(d.description); }
        if (d.status !== undefined) { updates.push(`status = $${idx++}`); values.push(d.status); }
        if (d.priority !== undefined) { updates.push(`priority = $${idx++}`); values.push(d.priority); }
        if (d.due_date !== undefined) { updates.push(`due_date = $${idx++}`); values.push(d.due_date); }

        if (updates.length > 0) {
          values.push(input.id);
          await client.query(`UPDATE todos SET ${updates.join(", ")} WHERE id = $${idx}`, values);
        }

        if (d.tag_ids !== undefined) {
          await client.query("DELETE FROM todo_tags WHERE todo_id = $1", [input.id]);
          if (d.tag_ids.length > 0) {
            const { rows: validTags } = await client.query("SELECT id FROM tags WHERE id = ANY($1)", [d.tag_ids]);
            if (validTags.length !== d.tag_ids.length) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "One or more tags not found" });
            }
            for (const tagId of d.tag_ids) {
              await client.query("INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)", [input.id, tagId]);
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

  delete: sessionProcedure
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

  addTag: sessionProcedure
    .input(z.object({ todoId: z.string().uuid(), tagId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withTenantContext(ctx.tenant!.id, async (client) => {
        const { rows: todoRows } = await client.query("SELECT id FROM todos WHERE id = $1", [input.todoId]);
        if (todoRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Todo not found" });

        const { rows: tagRows } = await client.query("SELECT id FROM tags WHERE id = $1", [input.tagId]);
        if (tagRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });

        await client.query("INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [input.todoId, input.tagId]);
        return { success: true };
      });
    }),

  removeTag: sessionProcedure
    .input(z.object({ todoId: z.string().uuid(), tagId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withTenantContext(ctx.tenant!.id, async (client) => {
        const { rowCount } = await client.query("DELETE FROM todo_tags WHERE todo_id = $1 AND tag_id = $2", [input.todoId, input.tagId]);
        if (rowCount === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not attached to todo" });
        }
        return { success: true };
      });
    }),
});
