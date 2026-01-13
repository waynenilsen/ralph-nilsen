import { TRPCError } from "@trpc/server";
import { router, publicProcedure, userProcedure } from "../init";
import {
  CreateInvitationSchema,
  RevokeInvitationSchema,
  GetInvitationByTokenSchema,
  AcceptInvitationSchema,
  DeclineInvitationSchema,
} from "@/shared/types";
import type {
  OrganizationInvitation,
  OrganizationInvitationWithInviter,
  OrganizationInvitationPublic,
} from "@/shared/types";
import { checkOrganizationRole } from "@/server/lib/session";
import { adminPool } from "@/server/db";
import { sendInvitationEmail, sendInvitationAcceptedEmail } from "@/server/lib/email";

const INVITATION_EXPIRY_DAYS = 7;

export const invitationsRouter = router({
  create: userProcedure.input(CreateInvitationSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.tenant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No organization context. Please select an organization.",
      });
    }

    // Check if user has owner or admin role
    const hasPermission = await checkOrganizationRole(ctx.user.id, ctx.tenant.id, [
      "owner",
      "admin",
    ]);
    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only organization owners and admins can send invitations",
      });
    }

    const client = await adminPool.connect();
    try {
      // Check for existing pending invitation
      const { rows: existing } = await client.query<OrganizationInvitation>(
        `SELECT * FROM organization_invitations
         WHERE tenant_id = $1 AND email = $2 AND status = 'pending'`,
        [ctx.tenant.id, input.email.toLowerCase()]
      );

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A pending invitation already exists for this email",
        });
      }

      // Check if user is already a member
      const { rows: existingMember } = await client.query(
        `SELECT 1 FROM users u
         JOIN user_tenants ut ON ut.user_id = u.id
         WHERE u.email = $1 AND ut.tenant_id = $2`,
        [input.email.toLowerCase(), ctx.tenant.id]
      );

      if (existingMember.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This user is already a member of the organization",
        });
      }

      // Create invitation with 7-day expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

      const { rows } = await client.query<OrganizationInvitation>(
        `INSERT INTO organization_invitations
         (tenant_id, email, role, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [ctx.tenant.id, input.email.toLowerCase(), input.role, ctx.user.id, expiresAt]
      );

      const invitation = rows[0]!;

      // Send invitation email (fire-and-forget)
      sendInvitationEmail({
        email: invitation.email,
        organizationName: ctx.tenant.name,
        inviterName: ctx.user.username,
        role: invitation.role,
        token: invitation.token,
      }).catch((err) => {
        console.error("Failed to send invitation email:", err);
      });

      return invitation;
    } finally {
      client.release();
    }
  }),

  list: userProcedure.query(async ({ ctx }) => {
    if (!ctx.tenant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No organization context. Please select an organization.",
      });
    }

    // Check if user has owner or admin role
    const hasPermission = await checkOrganizationRole(ctx.user.id, ctx.tenant.id, [
      "owner",
      "admin",
    ]);
    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only organization owners and admins can view invitations",
      });
    }

    const client = await adminPool.connect();
    try {
      const { rows } = await client.query<OrganizationInvitationWithInviter>(
        `SELECT oi.*, u.username as inviter_name, u.email as inviter_email
         FROM organization_invitations oi
         JOIN users u ON u.id = oi.invited_by
         WHERE oi.tenant_id = $1
         ORDER BY oi.created_at DESC`,
        [ctx.tenant.id]
      );

      return rows;
    } finally {
      client.release();
    }
  }),

  revoke: userProcedure.input(RevokeInvitationSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.tenant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No organization context. Please select an organization.",
      });
    }

    // Check if user has owner or admin role
    const hasPermission = await checkOrganizationRole(ctx.user.id, ctx.tenant.id, [
      "owner",
      "admin",
    ]);
    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only organization owners and admins can revoke invitations",
      });
    }

    const client = await adminPool.connect();
    try {
      const { rows } = await client.query<OrganizationInvitation>(
        `UPDATE organization_invitations
         SET status = 'revoked'
         WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
         RETURNING *`,
        [input.invitationId, ctx.tenant.id]
      );

      if (rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or cannot be revoked",
        });
      }

      return rows[0]!;
    } finally {
      client.release();
    }
  }),

  getByToken: publicProcedure.input(GetInvitationByTokenSchema).query(async ({ input }) => {
    const client = await adminPool.connect();
    try {
      const { rows } = await client.query<
        OrganizationInvitation & { organization_name: string; inviter_name: string }
      >(
        `SELECT oi.*, t.name as organization_name, u.username as inviter_name
         FROM organization_invitations oi
         JOIN tenants t ON t.id = oi.tenant_id
         JOIN users u ON u.id = oi.invited_by
         WHERE oi.token = $1`,
        [input.token]
      );

      if (rows.length === 0) {
        return null;
      }

      const invitation = rows[0]!;
      const isExpired = new Date(invitation.expires_at) < new Date();

      const result: OrganizationInvitationPublic = {
        organizationName: invitation.organization_name,
        inviterName: invitation.inviter_name,
        role: invitation.role,
        expiresAt: invitation.expires_at,
        isExpired,
        status: invitation.status,
      };

      return result;
    } finally {
      client.release();
    }
  }),

  accept: userProcedure.input(AcceptInvitationSchema).mutation(async ({ ctx, input }) => {
    console.log("[accept] Starting, getting connection from adminPool");
    const client = await adminPool.connect();
    console.log("[accept] Got connection, starting transaction");
    try {
      await client.query("BEGIN");
      console.log("[accept] Transaction started");

      // Get the invitation with inviter details
      console.log("[accept] Getting invitation with FOR UPDATE, token:", input.token);
      const { rows: invitations } = await client.query<
        OrganizationInvitation & { organization_name: string; inviter_email: string }
      >(
        `SELECT oi.*, t.name as organization_name, u.email as inviter_email
         FROM organization_invitations oi
         JOIN tenants t ON t.id = oi.tenant_id
         JOIN users u ON u.id = oi.invited_by
         WHERE oi.token = $1
         FOR UPDATE`,
        [input.token]
      );
      console.log("[accept] Got invitation, count:", invitations.length);

      if (invitations.length === 0) {
        await client.query("ROLLBACK");
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      const invitation = invitations[0]!;

      // Check if invitation is still pending
      if (invitation.status !== "pending") {
        await client.query("ROLLBACK");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This invitation has already been ${invitation.status}`,
        });
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        await client.query("ROLLBACK");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired",
        });
      }

      // Check if invitation email matches current user's email
      if (invitation.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
        await client.query("ROLLBACK");
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation was sent to a different email address",
        });
      }

      // Check if user is already a member
      console.log("[accept] Checking existing membership");
      const { rows: existingMember } = await client.query(
        `SELECT 1 FROM user_tenants WHERE user_id = $1 AND tenant_id = $2`,
        [ctx.user.id, invitation.tenant_id]
      );
      console.log("[accept] Existing member check done:", existingMember.length);

      if (existingMember.length > 0) {
        await client.query("ROLLBACK");
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this organization",
        });
      }

      // Add user to organization (inline to stay in same transaction)
      console.log("[accept] Adding user to organization");
      await client.query(
        `INSERT INTO user_tenants (user_id, tenant_id, role) VALUES ($1, $2, $3)`,
        [ctx.user.id, invitation.tenant_id, invitation.role]
      );
      console.log("[accept] User added to organization");

      // Update invitation status
      await client.query(
        `UPDATE organization_invitations
         SET status = 'accepted', accepted_at = NOW()
         WHERE id = $1`,
        [invitation.id]
      );

      await client.query("COMMIT");

      // Send invitation accepted notification to inviter (fire-and-forget)
      sendInvitationAcceptedEmail({
        inviterEmail: invitation.inviter_email,
        newMemberName: ctx.user.username,
        newMemberEmail: ctx.user.email,
        organizationName: invitation.organization_name,
      }).catch((err) => {
        console.error("Failed to send invitation accepted email:", err);
      });

      return {
        success: true,
        organizationName: invitation.organization_name,
        tenantId: invitation.tenant_id,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),

  decline: userProcedure.input(DeclineInvitationSchema).mutation(async ({ ctx, input }) => {
    const client = await adminPool.connect();
    try {
      // Get the invitation
      const { rows: invitations } = await client.query<OrganizationInvitation>(
        `SELECT * FROM organization_invitations WHERE token = $1`,
        [input.token]
      );

      if (invitations.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      const invitation = invitations[0]!;

      // Check if invitation is still pending
      if (invitation.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This invitation has already been ${invitation.status}`,
        });
      }

      // Check if invitation email matches current user's email
      if (invitation.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation was sent to a different email address",
        });
      }

      // Update invitation status
      const { rows } = await client.query<OrganizationInvitation>(
        `UPDATE organization_invitations
         SET status = 'declined'
         WHERE id = $1
         RETURNING *`,
        [invitation.id]
      );

      return rows[0]!;
    } finally {
      client.release();
    }
  }),
});
