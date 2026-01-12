import { TRPCError } from "@trpc/server";
import { router, userProcedure } from "../init";
import { CreateOrganizationSchema, SwitchOrganizationSchema } from "@/shared/types";
import {
  getUserOrganizations,
  createOrganization,
  userBelongsToTenant,
  updateSessionTenant,
} from "@/server/lib/session";
import { adminPool } from "@/server/db";
import type { Tenant } from "@/shared/types";

export const organizationsRouter = router({
  list: userProcedure.query(async ({ ctx }) => {
    return getUserOrganizations(ctx.user.id);
  }),

  create: userProcedure.input(CreateOrganizationSchema).mutation(async ({ ctx, input }) => {
    const { tenant, userTenant } = await createOrganization(ctx.user.id, input.name);

    return {
      tenant,
      role: userTenant.role,
    };
  }),

  switch: userProcedure.input(SwitchOrganizationSchema).mutation(async ({ ctx, input }) => {
    // Switch organization only works for session-based auth (web users)
    // API key users have a fixed tenant context
    if (!ctx.session) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Organization switching requires session authentication. API keys have a fixed tenant context.",
      });
    }

    // Verify user belongs to the tenant
    const belongs = await userBelongsToTenant(ctx.user!.id, input.tenantId);

    if (!belongs) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this organization",
      });
    }

    // Update session with new tenant
    const session = await updateSessionTenant(ctx.session.session_token, input.tenantId);

    if (!session) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to switch organization",
      });
    }

    // Get the tenant details
    const client = await adminPool.connect();
    try {
      const { rows } = await client.query<Tenant>("SELECT * FROM tenants WHERE id = $1", [
        input.tenantId,
      ]);

      return {
        tenant: rows[0]!,
      };
    } finally {
      client.release();
    }
  }),

  getCurrent: userProcedure.query(async ({ ctx }) => {
    return {
      tenant: ctx.tenant,
    };
  }),
});
