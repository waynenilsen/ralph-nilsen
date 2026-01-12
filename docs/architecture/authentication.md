# Authentication Architecture

This document describes the unified authentication system that allows both web users (via sessions) and API users (via API keys) to access the same endpoints seamlessly.

## Overview

The application supports two authentication methods that provide consistent user + tenant context:

1. **Session Authentication** - Cookie-based, for web browser users
2. **API Key Authentication** - Header-based, for programmatic API access

Both methods provide the same context to endpoints, enabling a single implementation to serve both web and API users.

## Authentication Methods

### Session Authentication (Web Users)

Used for web browser access via HTTP-only cookies.

**Flow:**
1. User signs up or signs in
2. Server creates session in `sessions` table
3. Server sets `session_token` cookie
4. Client includes cookie in subsequent requests
5. Server validates session and loads user + tenant context

**Context Provided:**
- `ctx.user` - User object
- `ctx.session` - Session object
- `ctx.tenant` - Tenant object (from session's current tenant)

### API Key Authentication (API Users)

Used for programmatic access via Authorization header.

**Flow:**
1. User creates API key (associated with their user account and a tenant)
2. Client includes `Authorization: Bearer <api_key>` header in requests
3. Server validates API key and loads user + tenant context

**Context Provided:**
- `ctx.user` - User object (from API key's user association)
- `ctx.apiKey` - ApiKey object
- `ctx.tenant` - Tenant object (from API key's tenant association)

## API Key Association with Users

**Critical Architectural Point:** API keys are associated with both **users** and **tenants**, not just tenants.

This enables:
- User-level audit trails for API key usage
- User-level permissions and authorization
- Consistent context between session and API key authentication

### Database Schema

```sql
-- api_keys table includes user_id
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- User association
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);
```

## tRPC Procedures

### userProcedure (Recommended)

**Use this for all user-facing endpoints.** Accepts both session cookies and API keys.

```typescript
import { router, userProcedure } from "../init";

export const myRouter = router({
  list: userProcedure.query(async ({ ctx }) => {
    // Works with BOTH session cookie AND API key
    // ctx.user is guaranteed (required for userProcedure)
    // ctx.tenant is guaranteed
    return withTenantContext(ctx.tenant!.id, async (client) => {
      // ... database operations
    });
  }),
});
```

**Context Available:**
- `ctx.user` - Always available (User object)
- `ctx.tenant` - Always available (Tenant object)
- `ctx.session` - Available if authenticated via session
- `ctx.apiKey` - Available if authenticated via API key

### protectedProcedure

For tenant-level operations that don't require user context. Requires API key authentication.

```typescript
import { router, protectedProcedure } from "../init";

export const myRouter = router({
  tenantStats: protectedProcedure.query(async ({ ctx }) => {
    // Only accessible via API key
    // ctx.tenant is available
    // ctx.user may or may not be available (depends on API key)
  }),
});
```

### adminProcedure

For admin-only operations. Requires admin API key.

```typescript
import { router, adminProcedure } from "../init";

export const tenantsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    // Only accessible with admin API key
  }),
});
```

### sessionProcedure (Deprecated)

**Deprecated:** Use `userProcedure` instead.

Only accepts session cookie authentication. Use `userProcedure` for unified authentication.

## Authentication Flow Diagram

```
                    Request
                       │
                       ▼
              ┌────────────────┐
              │ userProcedure  │
              └────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
    ┌─────────────┐        ┌─────────────┐
    │ Has Cookie? │        │ Has Bearer? │
    └─────────────┘        └─────────────┘
           │                       │
           ▼                       ▼
    ┌─────────────┐        ┌─────────────┐
    │  Validate   │        │  Validate   │
    │   Session   │        │   API Key   │
    └─────────────┘        └─────────────┘
           │                       │
           ▼                       ▼
    ┌─────────────┐        ┌─────────────┐
    │ ctx.user    │        │ ctx.user    │
    │ ctx.session │        │ ctx.apiKey  │
    │ ctx.tenant  │        │ ctx.tenant  │
    └─────────────┘        └─────────────┘
```

## Best Practices

### 1. Always Use userProcedure for User Endpoints

```typescript
// ✅ CORRECT: Single endpoint, both auth methods work
import { router, userProcedure } from "../init";

export const todosRouter = router({
  list: userProcedure.query(async ({ ctx }) => {
    // Both session and API key users can access this
  }),
});
```

```typescript
// ❌ WRONG: Separate endpoints for each auth method
import { router, sessionProcedure, protectedProcedure } from "../init";

export const todosRouter = router({
  // Forces web vs API separation
  listWeb: sessionProcedure.query(/* ... */),
  listApi: protectedProcedure.query(/* ... */),
});
```

### 2. Handle Session-Only Operations

Some operations only make sense for session-based auth (e.g., organization switching):

```typescript
switch: userProcedure
  .input(SwitchOrganizationSchema)
  .mutation(async ({ ctx, input }) => {
    // Check for session - this operation requires session auth
    if (!ctx.session) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Organization switching requires session authentication.",
      });
    }

    // Proceed with session-based operation
    await updateSessionTenant(ctx.session.session_token, input.tenantId);
  }),
```

### 3. Create API Keys with User Association

When creating API keys, always associate them with a user:

```typescript
const { apiKey, record } = await createApiKeyForTenant(
  tenantId,
  "My API Key",    // name
  undefined,       // expiresAt
  userId           // IMPORTANT: Associate with user
);
```

### 4. Check Auth Method When Needed

```typescript
myEndpoint: userProcedure.query(async ({ ctx }) => {
  // Check which auth method was used
  if (ctx.session) {
    // Authenticated via session (web user)
    console.log("Web user:", ctx.session.session_token);
  } else if (ctx.apiKey) {
    // Authenticated via API key
    console.log("API user:", ctx.apiKey.name);
  }

  // User and tenant are always available
  console.log("User:", ctx.user!.email);
  console.log("Tenant:", ctx.tenant!.name);
});
```

## Router Status

| Router          | Procedure         | Status     | Notes                                 |
|-----------------|-------------------|------------|---------------------------------------|
| `auth`          | `userProcedure`   | ✅ Updated | User authentication                   |
| `organizations` | `userProcedure`   | ✅ Updated | User org management                   |
| `todos`         | `userProcedure`   | ✅ Updated | Todo CRUD operations                  |
| `tags`          | `userProcedure`   | ✅ Updated | Tag CRUD operations                   |
| `tenants`       | `adminProcedure`  | ✅ Correct | Admin operations (no change needed)   |

## Migration Guide

### From sessionProcedure to userProcedure

1. Change import:
   ```typescript
   // Before
   import { router, sessionProcedure } from "../init";

   // After
   import { router, userProcedure } from "../init";
   ```

2. Replace procedure usage:
   ```typescript
   // Before
   list: sessionProcedure.query(/* ... */)

   // After
   list: userProcedure.query(/* ... */)
   ```

3. Handle session-specific operations:
   ```typescript
   // Add check for operations that need session
   if (!ctx.session) {
     throw new TRPCError({
       code: "BAD_REQUEST",
       message: "This operation requires session authentication.",
     });
   }
   ```

### From protectedProcedure to userProcedure

1. Change import and procedure (same as above)

2. Note: API keys now must have user association for `userProcedure`. If you need tenant-only API key access, keep using `protectedProcedure`.

## Testing

Integration tests verify both authentication methods provide consistent context:

```bash
# Run authentication tests
bun test tests/integration/auth.test.ts
```

See `tests/integration/auth.test.ts` for comprehensive test cases covering:
- Session validation and context
- API key validation and context
- Unified context consistency
- Error cases (expired, invalid, inactive)
