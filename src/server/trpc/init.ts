import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Tenant, ApiKey, User, Session } from "@/shared/types";
import { validateApiKey, validateAdminApiKey } from "@/server/lib/auth";
import { validateSession } from "@/server/lib/session";

export interface Context {
  tenant: Tenant | null;
  apiKey: ApiKey | null;
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  headers: Headers;
  cookies: { get: (name: string) => string | undefined };
}

/**
 * Initialize tRPC with context and superjson transformer.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware that requires a valid tenant API key.
 */
const requireTenant = t.middleware(async ({ ctx, next }) => {
  const authHeader = ctx.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header",
    });
  }

  const apiKey = authHeader.slice(7);
  const result = await validateApiKey(apiKey);

  if (!result) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired API key",
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenant: result.tenant,
      apiKey: result.apiKey,
    },
  });
});

/**
 * Middleware that requires admin API key.
 */
const requireAdmin = t.middleware(async ({ ctx, next }) => {
  const authHeader = ctx.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header",
    });
  }

  const apiKey = authHeader.slice(7);
  if (!validateAdminApiKey(apiKey)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      isAdmin: true,
    },
  });
});

/**
 * Middleware that requires a valid session (cookie-based auth).
 */
const requireSession = t.middleware(async ({ ctx, next }) => {
  const sessionToken = ctx.cookies.get("session_token");

  if (!sessionToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  const result = await validateSession(sessionToken);

  if (!result) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired session",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: result.user,
      session: result.session,
      tenant: result.tenant,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireTenant);
export const adminProcedure = t.procedure.use(requireAdmin);
export const sessionProcedure = t.procedure.use(requireSession);
