import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../init";
import { pool } from "@/server/db";
import { createApiKeyForTenant } from "@/server/lib/auth";
import { CreateTenantSchema, UpdateTenantSchema, type Tenant } from "@/shared/types";

export const tenantsRouter = router({
  list: adminProcedure.query(async () => {
    const { rows } = await pool.query<Tenant>("SELECT * FROM tenants ORDER BY created_at DESC");
    return rows;
  }),

  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { rows } = await pool.query<Tenant>("SELECT * FROM tenants WHERE id = $1", [input.id]);
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }
      return rows[0]!;
    }),

  create: adminProcedure
    .input(CreateTenantSchema)
    .mutation(async ({ input }) => {
      const { rows: existing } = await pool.query("SELECT id FROM tenants WHERE slug = $1", [input.slug]);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "A tenant with this slug already exists" });
      }

      const { rows } = await pool.query<Tenant>(
        "INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *",
        [input.name, input.slug]
      );
      const tenant = rows[0]!;

      const { apiKey } = await createApiKeyForTenant(tenant.id, "Initial API Key");

      return { tenant, apiKey };
    }),

  update: adminProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateTenantSchema }))
    .mutation(async ({ input }) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (input.data.name !== undefined) {
        updates.push(`name = $${idx++}`);
        values.push(input.data.name);
      }
      if (input.data.is_active !== undefined) {
        updates.push(`is_active = $${idx++}`);
        values.push(input.data.is_active);
      }

      if (updates.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      values.push(input.id);
      const { rows } = await pool.query<Tenant>(
        `UPDATE tenants SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }

      return rows[0]!;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const { rowCount } = await pool.query("DELETE FROM tenants WHERE id = $1", [input.id]);
      if (rowCount === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }
      return { success: true };
    }),

  stats: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { rows: tenantRows } = await pool.query("SELECT id FROM tenants WHERE id = $1", [input.id]);
      if (tenantRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }

      const { rows: todoStats } = await pool.query(`
        SELECT COUNT(*) as total,
               COUNT(*) FILTER (WHERE status = 'pending') as pending,
               COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM todos WHERE tenant_id = $1
      `, [input.id]);

      const { rows: tagStats } = await pool.query("SELECT COUNT(*) as count FROM tags WHERE tenant_id = $1", [input.id]);
      const { rows: keyStats } = await pool.query("SELECT COUNT(*) as count FROM api_keys WHERE tenant_id = $1 AND is_active = true", [input.id]);

      return {
        todos: {
          total: Number(todoStats[0]?.total || 0),
          pending: Number(todoStats[0]?.pending || 0),
          completed: Number(todoStats[0]?.completed || 0),
        },
        tags: Number(tagStats[0]?.count || 0),
        activeApiKeys: Number(keyStats[0]?.count || 0),
      };
    }),

  createApiKey: adminProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      name: z.string().max(255).optional(),
      expiresAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ input }) => {
      const { rows } = await pool.query("SELECT id FROM tenants WHERE id = $1", [input.tenantId]);
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }

      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
      const { apiKey, record } = await createApiKeyForTenant(input.tenantId, input.name, expiresAt);

      return { apiKey, record };
    }),
});
