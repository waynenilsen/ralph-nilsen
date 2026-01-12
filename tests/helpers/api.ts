/**
 * tRPC client helpers for testing.
 *
 * Provides factory functions for creating authenticated tRPC callers
 * that can be used in integration tests without going through HTTP.
 */

import { appRouter, type AppRouter } from "@/server/trpc/router";
import type { Context } from "@/server/trpc/init";
import type { Tenant, User, Session, ApiKey } from "@/shared/types";

/**
 * Create a mock context for tRPC testing.
 */
export function createMockContext(
  options: {
    tenant?: Tenant | null;
    user?: User | null;
    session?: Session | null;
    apiKey?: ApiKey | null;
    isAdmin?: boolean;
    cookies?: Record<string, string>;
    authHeader?: string;
  } = {}
): Context {
  const cookies = options.cookies || {};
  const headers = new Headers();

  if (options.authHeader) {
    headers.set("authorization", options.authHeader);
  }

  return {
    tenant: options.tenant || null,
    user: options.user || null,
    session: options.session || null,
    apiKey: options.apiKey || null,
    isAdmin: options.isAdmin || false,
    headers,
    cookies: {
      get: (name: string) => cookies[name],
    },
  };
}

/**
 * Create a tRPC caller with no authentication.
 * Use for testing public endpoints.
 */
export function createPublicCaller() {
  const ctx = createMockContext();
  return appRouter.createCaller(ctx);
}

/**
 * Create a tRPC caller authenticated with a session.
 * Use for testing session-based authentication.
 */
export function createSessionCaller(options: { user: User; tenant: Tenant; session: Session }) {
  const ctx = createMockContext({
    user: options.user,
    tenant: options.tenant,
    session: options.session,
    cookies: {
      session_token: options.session.session_token,
    },
  });
  return appRouter.createCaller(ctx);
}

/**
 * Create a tRPC caller authenticated with an API key.
 * Use for testing API key authentication.
 */
export function createApiKeyCaller(options: {
  user: User;
  tenant: Tenant;
  apiKey: ApiKey;
  rawKey: string;
}) {
  const ctx = createMockContext({
    user: options.user,
    tenant: options.tenant,
    apiKey: options.apiKey,
    authHeader: `Bearer ${options.rawKey}`,
  });
  return appRouter.createCaller(ctx);
}

/**
 * Create a tRPC caller with admin privileges.
 * Use for testing admin-only endpoints.
 */
export function createAdminCaller() {
  const adminKey = process.env.ADMIN_API_KEY || "admin-secret-key-change-in-production";
  const ctx = createMockContext({
    isAdmin: true,
    authHeader: `Bearer ${adminKey}`,
  });
  return appRouter.createCaller(ctx);
}

/**
 * Create a tRPC caller with tenant-only API key (no user).
 * Use for testing protectedProcedure endpoints.
 */
export function createTenantOnlyCaller(options: {
  tenant: Tenant;
  apiKey: ApiKey;
  rawKey: string;
}) {
  const ctx = createMockContext({
    tenant: options.tenant,
    apiKey: options.apiKey,
    authHeader: `Bearer ${options.rawKey}`,
  });
  return appRouter.createCaller(ctx);
}

/**
 * Type for the tRPC caller.
 */
export type TRPCCaller = ReturnType<typeof appRouter.createCaller>;

/**
 * Helper to create test user and tenant objects.
 * Use when you need to manually construct context objects.
 */
export function createTestUserObject(overrides: Partial<User> = {}): User {
  return {
    id: `user-${Date.now()}`,
    email: `test-${Date.now()}@test.com`,
    username: `testuser${Date.now()}`,
    password_hash: "hashed",
    email_verified: false,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Helper to create test tenant objects.
 */
export function createTestTenantObject(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: `tenant-${Date.now()}`,
    name: `Test Tenant ${Date.now()}`,
    slug: `test-${Date.now()}`,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Helper to create test session objects.
 */
export function createTestSessionObject(
  userId: string,
  tenantId: string | null,
  overrides: Partial<Session> = {}
): Session {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  return {
    id: `session-${Date.now()}`,
    user_id: userId,
    tenant_id: tenantId,
    session_token: `token-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    expires_at: expiresAt,
    created_at: new Date(),
    ...overrides,
  };
}

/**
 * Helper to create test API key objects.
 */
export function createTestApiKeyObject(
  tenantId: string,
  userId: string | null = null,
  overrides: Partial<ApiKey> = {}
): ApiKey {
  return {
    id: `apikey-${Date.now()}`,
    tenant_id: tenantId,
    user_id: userId,
    key_hash: "hashed",
    name: "Test API Key",
    last_used_at: null,
    expires_at: null,
    is_active: true,
    created_at: new Date(),
    ...overrides,
  };
}

/**
 * Create a complete test context with user, tenant, and session.
 * Convenience function for common test scenarios.
 */
export function createAuthenticatedTestContext(): {
  user: User;
  tenant: Tenant;
  session: Session;
  caller: TRPCCaller;
} {
  const user = createTestUserObject();
  const tenant = createTestTenantObject();
  const session = createTestSessionObject(user.id, tenant.id);
  const caller = createSessionCaller({ user, tenant, session });

  return { user, tenant, session, caller };
}

/**
 * Create test context with API key authentication.
 */
export function createApiKeyTestContext(): {
  user: User;
  tenant: Tenant;
  apiKey: ApiKey;
  rawKey: string;
  caller: TRPCCaller;
} {
  const user = createTestUserObject();
  const tenant = createTestTenantObject();
  const rawKey = `tk_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const apiKey = createTestApiKeyObject(tenant.id, user.id);
  const caller = createApiKeyCaller({ user, tenant, apiKey, rawKey });

  return { user, tenant, apiKey, rawKey, caller };
}
