import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, userProcedure } from "../init";
import { getOrganizationMembers, userBelongsToTenant } from "@/server/lib/session";

// Schema for getOrganizationMembers input
const GetOrganizationMembersSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID").optional(),
  search: z.string().optional(),
});

export const usersRouter = router({
  getOrganizationMembers: userProcedure
    .input(GetOrganizationMembersSchema)
    .query(async ({ ctx, input }) => {
      // Use provided organizationId or default to current tenant
      const tenantId = input.organizationId || ctx.tenant?.id;

      if (!tenantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No organization specified and no current organization selected",
        });
      }

      // Verify current user is member of the organization
      const isMember = await userBelongsToTenant(ctx.user.id, tenantId);
      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this organization",
        });
      }

      // Get all members
      let members = await getOrganizationMembers(tenantId);

      // Apply search filter if provided
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        members = members.filter(
          (member) =>
            member.username.toLowerCase().includes(searchLower) ||
            member.email.toLowerCase().includes(searchLower)
        );
      }

      // Order alphabetically by username
      members.sort((a, b) => a.username.localeCompare(b.username));

      // Return basic member info (excluding joinedAt as per the ticket)
      return members.map((member) => ({
        id: member.id,
        email: member.email,
        username: member.username,
        role: member.role,
      }));
    }),
});
