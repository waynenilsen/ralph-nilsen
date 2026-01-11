import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Tenant, ApiKey } from "@/shared/types";
import { validateApiKey, validateAdminApiKey } from "@/server/lib/auth";

export interface Context {
  tenant: Tenant | null;
  apiKey: ApiKey | null;
  isAdmin: boolean;
  headers: Headers;
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

export const protectedProcedure = t.procedure.use(requireTenant);
export const adminProcedure = t.procedure.use(requireAdmin);
