import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, sessionProcedure } from "../init";
import {
  SignupSchema,
  SigninSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
} from "@/shared/types";
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserByEmailOrUsername,
  comparePassword,
  createSession,
  deleteSession,
  getUserDefaultOrganization,
  createPasswordResetToken,
  validatePasswordResetToken,
  resetPassword,
  toUserPublic,
} from "@/server/lib/session";
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/server/lib/email";

export const authRouter = router({
  signup: publicProcedure
    .input(SignupSchema)
    .mutation(async ({ input }) => {
      // Check if email already exists
      const existingEmail = await findUserByEmail(input.email);
      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already in use",
        });
      }

      // Check if username already exists
      const existingUsername = await findUserByUsername(input.username);
      if (existingUsername) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already taken",
        });
      }

      // Create user, organization, and session
      const { user, tenant, session } = await createUser(
        input.email,
        input.username,
        input.password
      );

      // Send welcome email asynchronously
      sendWelcomeEmail(user.email, user.username).catch((err) => {
        console.error("Failed to send welcome email:", err);
      });

      return {
        user: toUserPublic(user),
        tenant,
        sessionToken: session.session_token,
      };
    }),

  signin: publicProcedure
    .input(SigninSchema)
    .mutation(async ({ input }) => {
      // Find user by email or username
      const user = await findUserByEmailOrUsername(input.identifier);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      // Verify password
      const passwordValid = await comparePassword(input.password, user.password_hash);
      if (!passwordValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      // Get user's default organization
      const tenant = await getUserDefaultOrganization(user.id);

      // Create session
      const session = await createSession(user.id, tenant?.id || null);

      return {
        user: toUserPublic(user),
        tenant,
        sessionToken: session.session_token,
      };
    }),

  signout: sessionProcedure
    .mutation(async ({ ctx }) => {
      await deleteSession(ctx.session.session_token);
      return { success: true };
    }),

  me: sessionProcedure
    .query(async ({ ctx }) => {
      return {
        user: toUserPublic(ctx.user),
        tenant: ctx.tenant,
      };
    }),

  requestPasswordReset: publicProcedure
    .input(RequestPasswordResetSchema)
    .mutation(async ({ input }) => {
      const user = await findUserByEmail(input.email);

      // Always return success to prevent email enumeration
      if (!user) {
        return { success: true };
      }

      // Create reset token
      const token = await createPasswordResetToken(user.id);

      // Send email asynchronously
      sendPasswordResetEmail(user.email, user.username, token).catch((err) => {
        console.error("Failed to send password reset email:", err);
      });

      return { success: true };
    }),

  validateResetToken: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await validatePasswordResetToken(input.token);
      return { valid: !!user };
    }),

  resetPassword: publicProcedure
    .input(ResetPasswordSchema)
    .mutation(async ({ input }) => {
      const success = await resetPassword(input.token, input.password);

      if (!success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      return { success: true };
    }),
});
