import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, userProcedure } from "../init";
import { withTenantContext } from "@/server/db";
import { CreateTagSchema, UpdateTagSchema, type Tag, type Todo } from "@/shared/types";

export const tagsRouter = router({
  list: userProcedure.query(async ({ ctx }) => {
    return withTenantContext(ctx.tenant!.id, async (client) => {
      const { rows } = await client.query<Tag>("SELECT * FROM tags ORDER BY name ASC");
      return rows;
    });
  }),

  get: userProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenantContext(ctx.tenant!.id, async (client) => {
        const { rows } = await client.query<Tag>("SELECT * FROM tags WHERE id = $1", [input.id]);
        if (rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
        }
        return rows[0]!;
      });
    }),

  create: userProcedure
    .input(CreateTagSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenant!.id;

      return withTenantContext(tenantId, async (client) => {
        const { rows: existing } = await client.query("SELECT id FROM tags WHERE name = $1", [input.name]);
        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "A tag with this name already exists" });
        }

        const { rows } = await client.query<Tag>(
          "INSERT INTO tags (tenant_id, name, color) VALUES ($1, $2, $3) RETURNING *",
          [tenantId, input.name, input.color || null]
        );

        return rows[0]!;
      });
    }),

  update: userProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateTagSchema }))
    .mutation(async ({ ctx, input }) => {
      return withTenantContext(ctx.tenant!.id, async (client) => {
        if (input.data.name !== undefined) {
          const { rows: existing } = await client.query(
            "SELECT id FROM tags WHERE name = $1 AND id != $2",
            [input.data.name, input.id]
          );
          if (existing.length > 0) {
            throw new TRPCError({ code: "CONFLICT", message: "A tag with this name already exists" });
          }
        }

        const updates: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (input.data.name !== undefined) { updates.push(`name = $${idx++}`); values.push(input.data.name); }
        if (input.data.color !== undefined) { updates.push(`color = $${idx++}`); values.push(input.data.color); }

        if (updates.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
        }

        values.push(input.id);
        const { rows } = await client.query<Tag>(
          `UPDATE tags SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
          values
        );

        if (rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
        }

        return rows[0]!;
      });
    }),

  delete: userProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withTenantContext(ctx.tenant!.id, async (client) => {
        const { rowCount } = await client.query("DELETE FROM tags WHERE id = $1", [input.id]);
        if (rowCount === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
        }
        return { success: true };
      });
    }),

  getTodos: userProcedure
    .input(z.object({ tagId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenantContext(ctx.tenant!.id, async (client) => {
        const { rows: tagRows } = await client.query("SELECT id FROM tags WHERE id = $1", [input.tagId]);
        if (tagRows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
        }

        const { rows } = await client.query<Todo>(
          `SELECT t.* FROM todos t JOIN todo_tags tt ON tt.todo_id = t.id
           WHERE tt.tag_id = $1 ORDER BY t.created_at DESC`,
          [input.tagId]
        );

        return rows;
      });
    }),
});
