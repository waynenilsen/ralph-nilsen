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
 * Note: For user-facing endpoints, prefer userProcedure which accepts both
 * session cookies and API keys.
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
      user: result.user,
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
 * Note: For user-facing endpoints, prefer userProcedure which accepts both
 * session cookies and API keys.
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

/**
 * Unified middleware that accepts EITHER session cookie OR API key.
 * Both authentication methods provide user + tenant context.
 *
 * Use this for all user-facing endpoints. Endpoints don't need to choose
 * between authentication methods - both work seamlessly.
 *
 * Authentication flow:
 * 1. First tries session authentication (cookie-based, for web users)
 * 2. Falls back to API key authentication (header-based, for API users)
 * 3. Returns 401 if neither method succeeds
 *
 * Context provided:
 * - ctx.user: User object (from session or API key)
 * - ctx.tenant: Tenant object (from session or API key)
 * - ctx.session: Session object (only if authenticated via session)
 * - ctx.apiKey: ApiKey object (only if authenticated via API key)
 */
const requireUser = t.middleware(async ({ ctx, next }) => {
  // Try session authentication first (for web users)
  const sessionToken = ctx.cookies.get("session_token");
  if (sessionToken) {
    const result = await validateSession(sessionToken);
    if (result) {
      return next({
        ctx: {
          ...ctx,
          user: result.user,
          session: result.session,
          tenant: result.tenant,
        },
      });
    }
  }

  // Fall back to API key authentication (for API users)
  const authHeader = ctx.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const result = await validateApiKey(apiKey);
    if (result) {
      // API key must have user association for userProcedure
      if (!result.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "API key must be associated with a user for this endpoint",
        });
      }
      return next({
        ctx: {
          ...ctx,
          user: result.user,
          tenant: result.tenant,
          apiKey: result.apiKey,
        },
      });
    }
  }

  // Neither authentication method succeeded
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Authentication required. Provide either session cookie or API key.",
  });
});

/**
 * Procedure that requires tenant API key authentication only.
 * Use for tenant-level operations that don't require user context.
 */
export const protectedProcedure = t.procedure.use(requireTenant);

/**
 * Procedure that requires admin API key authentication.
 * Use for admin-only operations.
 */
export const adminProcedure = t.procedure.use(requireAdmin);

/**
 * Procedure that requires session cookie authentication only.
 * Note: Prefer userProcedure for most user-facing endpoints.
 * @deprecated Use userProcedure instead for unified authentication
 */
export const sessionProcedure = t.procedure.use(requireSession);

/**
 * RECOMMENDED: Unified procedure that accepts both session cookie AND API key.
 * Use this for all user-facing endpoints.
 *
 * Both authentication methods provide the same context:
 * - ctx.user: User object (required)
 * - ctx.tenant: Tenant object (required)
 * - ctx.session OR ctx.apiKey: Indicates which auth method was used
 *
 * Examples:
 * ```typescript
 * export const myRouter = router({
 *   list: userProcedure.query(async ({ ctx }) => {
 *     // Works with BOTH session cookie AND API key
 *     // ctx.user and ctx.tenant are always available
 *     return withTenantContext(ctx.tenant!.id, async (client) => {
 *       // ... database operations
 *     });
 *   }),
 * });
 * ```
 */
export const userProcedure = t.procedure.use(requireUser);
