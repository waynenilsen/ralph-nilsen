# Product Requirements Document: Authentication Procedure Architecture Fix

## 1. Executive Summary

This document addresses a fundamental architectural flaw in the authentication system: **API keys and sessions are treated as mutually exclusive authentication methods when they should both represent users and work together seamlessly**.

**Critical Issue**:

- API keys are currently associated with **tenants only**, not **users**
- Endpoints must choose EITHER `protectedProcedure` (API key) OR `sessionProcedure` (session cookie)
- This creates a false dichotomy: web users can't use API key endpoints, and API key users don't have user context
- **API keys should represent users** (just like sessions do), and **both methods should work for the same endpoints**

**Impact**: High - Blocks core functionality for web users, prevents API key users from having user context, and creates architectural confusion that will cause ongoing issues.

## 2. Problem Statement

### 2.1 Current State

The application supports two authentication methods, but they are **mutually exclusive** and provide **different context**:

1. **API Key Authentication** (`protectedProcedure`)

   - Used for programmatic/API access
   - Requires `Authorization: Bearer <api_key>` header
   - Validates tenant API keys from `api_keys` table
   - **Only provides**: `ctx.tenant` and `ctx.apiKey`
   - **Missing**: `ctx.user` (no user context!)

2. **Session Authentication** (`sessionProcedure`)
   - Used for web browser access
   - Uses HTTP-only cookies (`session_token`)
   - Validates user sessions from `sessions` table
   - **Provides**: `ctx.user`, `ctx.session`, and `ctx.tenant`

### 2.2 The Core Architectural Problem

**Fundamental Issue**: API keys are currently associated with **tenants only**, not **users**. This creates a fundamental mismatch:

- **API keys should represent users** (just like sessions do)
- **Both authentication methods should work for the same endpoints**
- **Both methods should provide the same context** (user + tenant)

**Current Problems**:

1. **API keys don't represent users**: API keys are tied to tenants, not users, so there's no user context when using API keys
2. **Mutually exclusive procedures**: Endpoints must choose EITHER `protectedProcedure` OR `sessionProcedure`, not both
3. **Inconsistent context**: `protectedProcedure` provides tenant-only context, while `sessionProcedure` provides user+tenant context
4. **Broken web experience**: Web users can't access endpoints that use `protectedProcedure` (like tags router)

### 2.3 The Real Problem

**Root Cause**: The architecture forces a false choice between two authentication methods, when both should work together. API keys should represent users (like sessions do), and endpoints should accept either authentication method seamlessly.

**Discovery**: During signup flow testing, users successfully authenticated but were unable to:

- View their todos list
- Create, update, or delete todos
- Manage tags
- Access any todo-related functionality

**Error Pattern**:

```
GET /api/trpc/todos.list → 401 UNAUTHORIZED
Error: "Missing or invalid Authorization header"
```

### 2.3 Affected Components

#### Currently Broken (Fixed in this PRD)

- ✅ `todos` router - **FIXED** (changed to `sessionProcedure`)
- ❌ `tags` router - **STILL BROKEN** (uses `protectedProcedure`)

#### Correctly Implemented

- ✅ `auth` router - Uses `sessionProcedure` for protected endpoints
- ✅ `organizations` router - Uses `sessionProcedure` correctly
- ✅ `tenants` router - Uses `adminProcedure` correctly (admin-only)

### 2.4 Why This Is a Massive Architectural Issue

1. **Inconsistent Authentication Patterns**: No clear guidelines on when to use which authentication method
2. **Silent Failures**: The application appears to work (signup succeeds) but core features fail without clear error messages
3. **Developer Confusion**: New developers cannot determine which procedure to use for new endpoints
4. **Testing Gaps**: E2E tests may not catch this if they don't test the full user journey
5. **Scalability Risk**: As more endpoints are added, this pattern will likely repeat without clear guidelines

## 3. Goals and Objectives

### Primary Goals

- **Unify authentication**: Create a single `userProcedure` that accepts both session cookies and API keys
- **API keys represent users**: Associate API keys with users, not just tenants
- **Consistent context**: Both authentication methods provide identical context (user + tenant)
- **Seamless experience**: Endpoints work with either authentication method without code changes
- **Clear architecture**: Document unified authentication pattern for future development

### Success Criteria

- All endpoints work with both session cookies (web users) and API keys (API users)
- API keys provide user context (not just tenant context)
- Single `userProcedure` replaces both `protectedProcedure` and `sessionProcedure` for user endpoints
- No authentication-related errors in production
- Developers understand: "Use `userProcedure` for user endpoints, both auth methods work"

## 4. Functional Requirements

### 4.1 Immediate Fixes

**FR-1**: Create unified `userProcedure` middleware

- Accepts either session cookie or API key
- Provides consistent user + tenant context
- Replaces both `protectedProcedure` and `sessionProcedure` for user endpoints

**FR-2**: Update API key schema to associate with users

- Add `user_id` column to `api_keys` table
- Update API key creation to require user association
- Update API key validation to load user context

**FR-3**: Migrate all user-facing endpoints to `userProcedure`

- Update `todos` router (currently uses `sessionProcedure`)
- Update `tags` router (currently uses `protectedProcedure`)
- Update `organizations` router (currently uses `sessionProcedure`)
- All endpoints work with both authentication methods

### 4.2 Unified Authentication Architecture

**FR-3**: Create a unified authentication system where:

1. **API keys represent users** (not just tenants)

   - API keys must be associated with users in the database
   - API keys should provide the same context as sessions: `user` + `tenant`
   - Users can have multiple API keys (like they can have multiple sessions)

2. **Single procedure for user endpoints**

   - Create `userProcedure` that accepts **either** session cookie **or** API key
   - Both methods provide identical context: `ctx.user`, `ctx.tenant`, `ctx.session` (or `ctx.apiKey`)
   - Endpoints don't need to choose between authentication methods

3. **Backward compatibility**
   - Keep `protectedProcedure` for tenant-only operations (if needed)
   - Keep `adminProcedure` for admin operations
   - Migrate all user-facing endpoints to `userProcedure`

### 4.3 API Key Schema Changes

**FR-4**: Update API key model to associate with users:

- Add `user_id` column to `api_keys` table
- API keys belong to both a user AND a tenant
- When validating API key, also load user context
- API key provides same context as session: user + tenant

### 4.4 Unified Authentication Middleware

**FR-5**: Create `userProcedure` middleware that:

1. **First tries session authentication**:

   - Checks for `session_token` cookie
   - Validates session and loads user + tenant
   - Sets `ctx.user`, `ctx.session`, `ctx.tenant`

2. **Falls back to API key authentication**:

   - Checks for `Authorization: Bearer <api_key>` header
   - Validates API key and loads associated user + tenant
   - Sets `ctx.user`, `ctx.apiKey`, `ctx.tenant`

3. **Provides consistent context**:
   - Both methods set `ctx.user` and `ctx.tenant`
   - Endpoints can use either authentication method transparently
   - No code changes needed in endpoint implementations

## 5. Technical Requirements

### 5.1 Database Schema Changes

#### 5.1.1 API Keys Table Migration

**File**: New migration file `006_user_api_keys.sql`

**Changes**:

```sql
-- Add user_id to api_keys table
ALTER TABLE api_keys
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Make user_id required for new API keys (after migration)
-- Note: Existing API keys may have NULL user_id temporarily

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Update API key creation to require user_id
-- (This will be enforced in application code)
```

#### 5.1.2 API Key Validation Updates

**File**: `src/server/lib/auth.ts`

**Changes**:

```typescript
// BEFORE: validateApiKey returns tenant only
export async function validateApiKey(
  apiKey: string
): Promise<{ tenant: Tenant; apiKey: ApiKey } | null>;

// AFTER: validateApiKey returns user + tenant
export async function validateApiKey(
  apiKey: string
): Promise<{ user: User; tenant: Tenant; apiKey: ApiKey } | null>;
```

**Implementation**:

- Load user from `api_keys.user_id`
- Return user context along with tenant
- Maintain backward compatibility during migration

### 5.2 Unified Authentication Middleware

#### 5.2.1 Create userProcedure

**File**: `src/server/trpc/init.ts`

**New Middleware**:

```typescript
/**
 * Unified middleware that accepts either session cookie or API key.
 * Both methods provide user + tenant context.
 */
const requireUser = t.middleware(async ({ ctx, next }) => {
  // Try session authentication first
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

  // Fall back to API key authentication
  const authHeader = ctx.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const result = await validateApiKey(apiKey);
    if (result) {
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

  // Neither method worked
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message:
      "Authentication required. Provide either session cookie or API key.",
  });
});

export const userProcedure = t.procedure.use(requireUser);
```

#### 5.2.2 Update All User-Facing Routers

**Files**:

- `src/server/trpc/routers/todos.ts`
- `src/server/trpc/routers/tags.ts`
- `src/server/trpc/routers/organizations.ts`

**Changes**:

```typescript
// BEFORE (inconsistent)
import { router, sessionProcedure } from "../init"; // todos, organizations
import { router, protectedProcedure } from "../init"; // tags

// AFTER (unified)
import { router, userProcedure } from "../init";

export const todosRouter = router({
  list: userProcedure.query(async ({ ctx }) => {
    // ctx.user and ctx.tenant available from either auth method
    // ...
  }),
});
```

### 5.2 Testing Requirements

#### 5.2.1 E2E Test Updates

**File**: `tests/e2e/todos.spec.ts` (if exists) or create new test

**Test Cases**:

1. User can list todos after signup
2. User can create todos
3. User can update todos
4. User can delete todos
5. User can manage tags
6. User can add/remove tags from todos

#### 5.2.2 Integration Tests

**File**: `tests/integration/auth.test.ts` (extend existing)

**Test Cases**:

1. Session-based endpoints reject requests without session cookie
2. Session-based endpoints accept requests with valid session cookie
3. API key endpoints reject requests without API key header
4. API key endpoints accept requests with valid API key header

#### 5.2.3 Unit Tests

**Test**: Authentication middleware behavior

- Verify `sessionProcedure` sets correct context
- Verify `protectedProcedure` sets correct context
- Verify error handling for invalid credentials

### 5.3 Documentation Requirements

#### 5.3.1 Architecture Documentation

**File**: `docs/architecture/authentication.md` (new)

**Content**:

- Authentication methods overview
- When to use each procedure type
- Context object structure for each method
- Examples of correct usage
- Common pitfalls and how to avoid them

#### 5.3.2 Code Comments

**Update**: `src/server/trpc/init.ts`

**Add**:

- Clear JSDoc comments for each procedure type
- Usage examples in comments
- Migration guide for updating existing endpoints

### 5.4 Validation Checklist

Before considering this fix complete:

- [ ] All `tags` router endpoints use `sessionProcedure`
- [ ] All `todos` router endpoints use `sessionProcedure` (already fixed)
- [ ] E2E tests pass for full user journey
- [ ] Integration tests verify authentication behavior
- [ ] Documentation updated with authentication guidelines
- [ ] Code review completed
- [ ] No authentication errors in browser console
- [ ] All network requests return 200 (not 401) for authenticated users

## 6. Implementation Plan

### Phase 1: Database Schema Updates (Critical)

1. Create migration to add `user_id` to `api_keys` table
2. Update `validateApiKey` function to load and return user context
3. Update API key creation endpoints to require user association
4. Test API key validation with user context

**Estimated Time**: 2-3 hours

### Phase 2: Unified Authentication Middleware (Critical)

1. Create `userProcedure` middleware in `init.ts`
2. Implement dual authentication (session first, then API key)
3. Ensure consistent context from both methods
4. Add comprehensive error handling

**Estimated Time**: 2-3 hours

### Phase 3: Router Migration

1. Update `todos` router to use `userProcedure`
2. Update `tags` router to use `userProcedure`
3. Update `organizations` router to use `userProcedure`
4. Verify all endpoints work with both auth methods
5. Test in browser (session) and with API client (API key)

**Estimated Time**: 1-2 hours

### Phase 4: Testing & Validation

1. Add E2E tests for both authentication methods
2. Test endpoints with session cookies (web users)
3. Test endpoints with API keys (API users)
4. Verify both methods provide same context
5. Integration tests for unified authentication
6. Run full test suite

**Estimated Time**: 3-4 hours

### Phase 5: Documentation

1. Create authentication architecture document
2. Document unified authentication pattern
3. Update API documentation with dual auth support
4. Add code comments and examples
5. Create developer guide for new endpoints

**Estimated Time**: 2-3 hours

### Phase 6: Migration & Cleanup

1. Migrate existing API keys to associate with users (if possible)
2. Update API key creation UI/endpoints
3. Deprecate old `protectedProcedure` for user endpoints
4. Keep `protectedProcedure` only for tenant-only operations (if any)
5. Update all documentation references

**Estimated Time**: 2-3 hours

## 7. Risk Assessment

### 7.1 Risks

**Risk 1**: Breaking existing API key integrations

- **Mitigation**: API key endpoints are separate (`protectedProcedure`), web endpoints use sessions
- **Impact**: Low - No current API key integrations identified

**Risk 2**: Session tenant context may be null

- **Mitigation**: Ensure all sessions have tenant_id set (default org on signup)
- **Impact**: Medium - Could cause runtime errors
- **Solution**: Add null checks and proper error handling

**Risk 3**: Future developers repeat the mistake

- **Mitigation**: Clear documentation, code comments, and testing
- **Impact**: High - Could cause same issue in future
- **Solution**: Comprehensive documentation and review process

### 7.2 Rollback Plan

If issues arise:

1. Revert `tags` router changes
2. Keep `todos` router fix (already working)
3. Investigate issue
4. Re-apply fix with corrections

## 8. Future Considerations

### 8.1 Dual Authentication Support

Consider creating a `flexibleProcedure` that accepts either:

- Session cookie (for web users)
- API key header (for programmatic access)

This would allow endpoints to support both authentication methods.

### 8.2 Authentication Middleware Refactoring

Consider:

- Extracting common authentication logic
- Creating reusable middleware functions
- Standardizing context object structure
- Adding authentication method detection utilities

### 8.3 API Versioning

If API key access becomes important:

- Version API endpoints (`/api/v1/...`)
- Separate API key endpoints from web endpoints
- Document API key usage separately

## 9. Related Issues

### 9.1 Current Issues Fixed

- ✅ Todos endpoints return 401 after signup
- ❌ Tags endpoints return 401 after signup (to be fixed)

### 9.2 Potential Related Issues

- Session tenant context validation
- Error message clarity for authentication failures
- Frontend error handling for 401 responses

## 10. Success Metrics

### 10.1 Immediate Metrics

- Zero 401 errors for authenticated web users
- All E2E tests passing
- 100% of user-facing endpoints use correct authentication

### 10.2 Long-term Metrics

- No authentication-related bugs in production
- Clear developer understanding (survey/feedback)
- Reduced time to implement new authenticated endpoints

## 11. Appendix

### 11.1 Current Router Status

| Router          | Current Procedure    | Target Procedure | Status     | Notes                                 |
| --------------- | -------------------- | ---------------- | ---------- | ------------------------------------- |
| `auth`          | `sessionProcedure`   | `userProcedure`  | 🔄 Migrate | User authentication (both methods)    |
| `organizations` | `sessionProcedure`   | `userProcedure`  | 🔄 Migrate | User org management (both methods)    |
| `todos`         | `sessionProcedure`   | `userProcedure`  | 🔄 Migrate | Was `protectedProcedure`, now session |
| `tags`          | `protectedProcedure` | `userProcedure`  | ❌ Broken  | Currently broken for web users        |
| `tenants`       | `adminProcedure`     | `adminProcedure` | ✅ Keep    | Admin operations (no change needed)   |

### 11.2 Authentication Flow Comparison

#### Session Authentication Flow

```
1. User signs up/signs in
2. Server creates session in database
3. Server sets session_token cookie
4. Client includes cookie in requests
5. Server validates session via sessionProcedure
6. Server sets ctx.user, ctx.session, ctx.tenant
```

#### API Key Authentication Flow

```
1. Client obtains API key (admin operation)
2. Client includes Authorization: Bearer <key> header
3. Server validates API key via protectedProcedure
4. Server sets ctx.tenant, ctx.apiKey
5. No user context available
```

### 11.3 Code Examples

#### Correct: Unified authentication endpoint

```typescript
import { router, userProcedure } from "../init";

export const myRouter = router({
  list: userProcedure.query(async ({ ctx }) => {
    // ✅ Works with BOTH session cookie AND API key
    // ctx.user is available (from either auth method)
    // ctx.tenant is available (from either auth method)
    // ctx.session OR ctx.apiKey is available (depending on auth method)

    return withTenantContext(ctx.tenant!.id, async (client) => {
      // ... database operations
      // Can access ctx.user.id, ctx.user.email, etc.
    });
  }),
});
```

#### Incorrect: Using separate procedures

```typescript
// ❌ WRONG: Forces choice between auth methods
import { router, sessionProcedure, protectedProcedure } from "../init";

export const myRouter = router({
  // Only works with sessions
  list: sessionProcedure.query(async ({ ctx }) => {
    // API key users can't access this
  }),

  // Only works with API keys
  listApi: protectedProcedure.query(async ({ ctx }) => {
    // Web users can't access this
    // Also: ctx.user is NOT available!
  }),
});
```

#### Correct: Single endpoint, both methods

```typescript
// ✅ CORRECT: One endpoint, both auth methods work
import { router, userProcedure } from "../init";

export const myRouter = router({
  // Works with both session cookie AND API key
  list: userProcedure.query(async ({ ctx }) => {
    // Both methods provide ctx.user and ctx.tenant
    // Endpoint code doesn't need to know which auth method was used
  }),
});
```
