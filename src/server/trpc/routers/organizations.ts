import { TRPCError } from "@trpc/server";
import { router, userProcedure } from "../init";
import {
  CreateOrganizationSchema,
  SwitchOrganizationSchema,
  RemoveMemberSchema,
  UpdateMemberRoleSchema,
  TransferOwnershipSchema,
} from "@/shared/types";
import {
  getUserOrganizations,
  createOrganization,
  userBelongsToTenant,
  updateSessionTenant,
  getUserRoleInTenant,
  getOrganizationMembers,
  removeMemberFromOrganization,
  updateMemberRole,
  transferOwnership,
  getUserDefaultOrganization,
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

  getMembers: userProcedure.query(async ({ ctx }) => {
    if (!ctx.tenant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No organization selected",
      });
    }

    return getOrganizationMembers(ctx.tenant.id);
  }),

  removeMember: userProcedure.input(RemoveMemberSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.tenant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No organization selected",
      });
    }

    // Check current user's role
    const currentUserRole = await getUserRoleInTenant(ctx.user.id, ctx.tenant.id);
    if (!currentUserRole || (currentUserRole !== "owner" && currentUserRole !== "admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can remove members",
      });
    }

    // Get target user's role
    const targetRole = await getUserRoleInTenant(input.userId, ctx.tenant.id);
    if (!targetRole) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User is not a member of this organization",
      });
    }

    // Cannot remove owner
    if (targetRole === "owner") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot remove the organization owner. Transfer ownership first.",
      });
    }

    // Admins cannot remove other admins
    if (currentUserRole === "admin" && targetRole === "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admins cannot remove other admins",
      });
    }

    // Cannot remove yourself (use leave instead)
    if (input.userId === ctx.user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot remove yourself. Use leave instead.",
      });
    }

    const success = await removeMemberFromOrganization(ctx.tenant.id, input.userId);
    if (!success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to remove member",
      });
    }

    return { success: true };
  }),

  updateMemberRole: userProcedure.input(UpdateMemberRoleSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.tenant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No organization selected",
      });
    }

    // Check current user's role
    const currentUserRole = await getUserRoleInTenant(ctx.user.id, ctx.tenant.id);
    if (!currentUserRole || (currentUserRole !== "owner" && currentUserRole !== "admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can change member roles",
      });
    }

    // Get target user's role
    const targetRole = await getUserRoleInTenant(input.userId, ctx.tenant.id);
    if (!targetRole) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User is not a member of this organization",
      });
    }

    // Cannot change owner's role (must transfer)
    if (targetRole === "owner") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot change owner's role. Use transfer ownership instead.",
      });
    }

    // Admins can only promote members to admin
    if (currentUserRole === "admin") {
      if (targetRole === "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot change other admins' roles",
        });
      }
      if (input.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins can only promote members to admin",
        });
      }
    }

    // Cannot change your own role
    if (input.userId === ctx.user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot change your own role",
      });
    }

    const success = await updateMemberRole(ctx.tenant.id, input.userId, input.role);
    if (!success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update member role",
      });
    }

    return { success: true };
  }),

  transferOwnership: userProcedure
    .input(TransferOwnershipSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenant) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No organization selected",
        });
      }

      // Only owner can transfer ownership
      const currentUserRole = await getUserRoleInTenant(ctx.user.id, ctx.tenant.id);
      if (currentUserRole !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can transfer ownership",
        });
      }

      // Target must be an existing member
      const targetRole = await getUserRoleInTenant(input.userId, ctx.tenant.id);
      if (!targetRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      // Cannot transfer to yourself
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already the owner",
        });
      }

      const success = await transferOwnership(ctx.tenant.id, ctx.user.id, input.userId);
      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to transfer ownership",
        });
      }

      return { success: true };
    }),

  leave: userProcedure.mutation(async ({ ctx }) => {
    if (!ctx.tenant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No organization selected",
      });
    }

    // Get current user's role
    const currentUserRole = await getUserRoleInTenant(ctx.user.id, ctx.tenant.id);
    if (!currentUserRole) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "You are not a member of this organization",
      });
    }

    // Owners cannot leave (must transfer first)
    if (currentUserRole === "owner") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Owners cannot leave the organization. Transfer ownership first.",
      });
    }

    // Remove user from organization
    const success = await removeMemberFromOrganization(ctx.tenant.id, ctx.user.id);
    if (!success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to leave organization",
      });
    }

    // If leaving current active org, switch to another org
    let newActiveTenant: Tenant | null = null;
    if (ctx.session) {
      // Get the user's next available organization
      newActiveTenant = await getUserDefaultOrganization(ctx.user.id);

      if (newActiveTenant) {
        await updateSessionTenant(ctx.session.session_token, newActiveTenant.id);
      }
    }

    return {
      success: true,
      newActiveTenant,
    };
  }),
});
