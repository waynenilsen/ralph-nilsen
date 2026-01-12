# Product Requirements Document: Comprehensive Test Suite

## 1. Executive Summary

This document outlines the requirements for implementing a comprehensive test suite for the multi-tenant todo application. Testing is currently a critical gap that blocks MVP release and prevents confident deployment.

**Purpose**: Establish a robust testing foundation that validates authentication, tenant isolation, business logic, and user flows.

**Status**: Tests are not implemented. Test infrastructure exists (Bun test, Playwright) but no test files are present.

## 2. Goals and Objectives

### Primary Goals

- Implement unit tests for core business logic
- Implement integration tests for database operations and RLS enforcement
- Implement E2E tests for critical user flows with Playwright
- Achieve >90% test coverage on critical paths
- Enable confident refactoring and deployment

### Success Criteria

- All unit tests pass
- All integration tests pass
- All E2E tests pass
- RLS policies verified to prevent cross-tenant access
- Authentication flows validated end-to-end
- CI/CD pipeline can run tests automatically

## 3. Testing Strategy

### 3.1 Test Categories

#### Unit Tests (`tests/unit/`)
- Test individual functions in isolation
- Mock external dependencies (database, email)
- Fast execution (<5 seconds total)
- Focus: Business logic, validation, helpers

#### Integration Tests (`tests/integration/`)
- Test database operations with real PostgreSQL
- Test tRPC routers end-to-end
- Test RLS policy enforcement
- Test tenant isolation
- Requires test database setup/teardown

#### E2E Tests (`tests/e2e/`)
- Test complete user flows in browser
- Use Playwright for browser automation
- Test with MailHog for email verification
- Test authentication persistence
- Test protected route behavior

### 3.2 Test Database Setup

```typescript
// tests/helpers/db.ts
- createTestDatabase() - Creates isolated test database
- seedTestData() - Seeds test tenants, users, todos
- cleanupTestData() - Cleans up after tests
- getTestClient() - Returns database client for tests
```

### 3.3 Test Fixtures

```typescript
// tests/helpers/fixtures.ts
- createTestTenant() - Creates a test tenant
- createTestUser() - Creates a test user
- createTestSession() - Creates an authenticated session
- createTestApiKey() - Creates a user-scoped API key
- createTestTodo() - Creates a test todo
- createTestTag() - Creates a test tag
```

## 4. Functional Requirements

### 4.1 Unit Tests

#### Auth Library Tests (`tests/unit/server/lib/auth.test.ts`)

**FR-1**: Test API key hashing
- `hashApiKey()` produces consistent hash
- `compareApiKey()` correctly validates matching keys
- `compareApiKey()` rejects non-matching keys

**FR-2**: Test API key generation
- `generateApiKey()` produces 32-character keys
- `generateApiKey()` uses `tk_` prefix
- Generated keys are unique

**FR-3**: Test API key validation
- `validateApiKey()` returns user + tenant for valid key
- `validateApiKey()` returns null for invalid key
- `validateApiKey()` returns null for expired key
- `validateApiKey()` returns null for inactive key

#### Session Library Tests (`tests/unit/server/lib/session.test.ts`)

**FR-4**: Test password hashing
- Password hashing produces consistent results
- Password comparison works correctly
- Invalid passwords are rejected

**FR-5**: Test session token generation
- Session tokens are UUIDs
- Session tokens are unique

**FR-6**: Test session validation
- Valid sessions return user + tenant context
- Expired sessions return null
- Invalid session tokens return null

#### Validation Tests (`tests/unit/shared/validation.test.ts`)

**FR-7**: Test input validation
- Email validation (valid formats, invalid formats)
- Username validation (alphanumeric, length constraints)
- Password validation (minimum length, complexity if any)
- Todo title validation (required, max length)

### 4.2 Integration Tests

#### Database Operations (`tests/integration/db/`)

**FR-8**: Test tenant operations
- Create tenant
- Read tenant by ID
- Update tenant
- Delete tenant cascades related data

**FR-9**: Test user operations
- Create user (auto-creates org)
- Find user by email
- Find user by username
- Find user by email or username
- Update user

**FR-10**: Test todo operations
- Create todo for tenant
- Read todo (respects RLS)
- Update todo (respects RLS)
- Delete todo (respects RLS)
- List todos with pagination
- Filter todos by status/priority/due date
- Search todos by title/description

**FR-11**: Test tag operations
- Create tag for tenant
- Update tag
- Delete tag (cascades todo_tags)
- Add tag to todo
- Remove tag from todo

#### RLS Policy Tests (`tests/integration/rls/`)

**FR-12**: Test tenant isolation
- Tenant A cannot read Tenant B's todos
- Tenant A cannot update Tenant B's todos
- Tenant A cannot delete Tenant B's todos
- Tenant A cannot read Tenant B's tags
- Cross-tenant operations fail silently (return empty, not error)

**FR-13**: Test RLS with direct queries
- Queries without tenant context fail or return empty
- Setting tenant context enables access
- Switching tenant context changes visible data

#### tRPC Router Tests (`tests/integration/trpc/`)

**FR-14**: Test auth router
- `signup` creates user + org + session
- `signin` validates credentials and creates session
- `signout` destroys session
- `me` returns current user
- `requestPasswordReset` creates token
- `resetPassword` updates password

**FR-15**: Test todos router
- All CRUD operations work with session auth
- All CRUD operations work with API key auth
- Filtering and pagination work correctly
- Tag operations work correctly

**FR-16**: Test tags router
- All CRUD operations work with session auth
- All CRUD operations work with API key auth

**FR-17**: Test organizations router
- List user organizations
- Create new organization
- Switch organization (updates session)

**FR-18**: Test tenants router (admin)
- Admin can list tenants
- Admin can create tenants
- Admin can update tenants
- Admin can delete tenants
- Non-admin cannot access admin endpoints

### 4.3 E2E Tests

#### Signup Flow (`tests/e2e/auth/signup.spec.ts`)

**FR-19**: Complete signup flow
1. Visit homepage
2. Click "Sign Up" link
3. Fill signup form (email, username, password)
4. Submit form
5. Verify redirect to `/app/todos`
6. Verify session cookie is set
7. Verify welcome email in MailHog

**FR-20**: Signup validation
- Invalid email shows error
- Duplicate email shows error
- Duplicate username shows error
- Weak password shows error (if validation exists)
- Missing fields show errors

#### Signin Flow (`tests/e2e/auth/signin.spec.ts`)

**FR-21**: Complete signin flow
1. Visit `/signin`
2. Enter valid credentials
3. Submit form
4. Verify redirect to `/app/todos`
5. Verify session cookie is set
6. Verify user can access protected routes

**FR-22**: Signin validation
- Invalid credentials show error
- Non-existent user shows error
- Form validates required fields

#### Password Reset Flow (`tests/e2e/auth/reset-password.spec.ts`)

**FR-23**: Complete reset flow
1. Visit `/reset-password`
2. Enter email address
3. Submit request
4. Verify email in MailHog
5. Extract reset token from email
6. Visit `/reset-password/[token]`
7. Enter new password
8. Submit form
9. Verify redirect to `/signin`
10. Sign in with new password

**FR-24**: Reset validation
- Invalid token shows error
- Expired token shows error
- Already-used token shows error

#### Protected Routes (`tests/e2e/routes/protected.spec.ts`)

**FR-25**: Route protection
- Visiting `/app/*` without auth redirects to `/signin`
- After signin, redirect back to original route
- Signout removes session and redirects to homepage

#### Organization Management (`tests/e2e/organizations/`)

**FR-26**: Organization switching
1. Sign in as user with multiple orgs
2. View organization list
3. Switch to different organization
4. Verify todos change (isolated per org)
5. Create new todo
6. Switch back to original org
7. Verify new todo not visible

**FR-27**: Organization creation
1. Create new organization
2. Verify organization appears in list
3. Switch to new organization
4. Create todo in new organization

#### Todo Management (`tests/e2e/todos/`)

**FR-28**: Todo CRUD
- Create todo with all fields
- View todo list
- Update todo
- Delete todo
- Mark todo complete/incomplete

**FR-29**: Todo filtering
- Filter by status
- Filter by priority
- Search by text
- Clear filters

**FR-30**: Tag management in todos
- Create new tag
- Add tag to todo
- Remove tag from todo
- Filter todos by tag

### 4.4 Authentication Method Verification

**FR-31**: Unified authentication verification
- Create test that uses session auth to access todos router
- Create test that uses API key auth to access same endpoint
- Verify both methods provide same functionality
- Verify both methods provide user context

## 5. Technical Requirements

### 5.1 Test Infrastructure

#### Test Configuration

```typescript
// tests/setup.ts
- Global setup for all tests
- Database connection setup
- Test isolation setup
- MailHog integration

// tests/teardown.ts
- Global teardown
- Database cleanup
- Connection pool cleanup
```

#### Test Utilities

```typescript
// tests/helpers/api.ts
- createTRPCClient() - Creates tRPC client for testing
- createSessionClient() - Client with session auth
- createApiKeyClient() - Client with API key auth

// tests/helpers/email.ts
- getMailHogEmails() - Fetch emails from MailHog
- waitForEmail() - Wait for specific email
- extractResetToken() - Extract token from email body
```

### 5.2 Playwright Configuration

```typescript
// playwright.config.ts
- Base URL: http://localhost:40000
- Test directory: tests/e2e
- Screenshots on failure
- Video on failure
- MailHog integration
- Test isolation (clear DB between tests)
```

### 5.3 Test Database

- Use same PostgreSQL container
- Run migrations before tests
- Seed test data
- Clean up between test suites
- Transaction rollback for isolation

### 5.4 CI/CD Integration

- Run unit tests on every commit
- Run integration tests on PR
- Run E2E tests before deploy
- Report test coverage
- Block merge on test failures

## 6. File Structure

```
tests/
├── setup.ts                    # Global test setup
├── teardown.ts                 # Global test teardown
├── helpers/
│   ├── db.ts                   # Database test utilities
│   ├── fixtures.ts             # Test data fixtures
│   ├── api.ts                  # API client helpers
│   └── email.ts                # MailHog helpers
├── unit/
│   └── server/
│       └── lib/
│           ├── auth.test.ts    # Auth library tests
│           └── session.test.ts # Session library tests
├── integration/
│   ├── db/
│   │   ├── tenants.test.ts     # Tenant operations
│   │   ├── users.test.ts       # User operations
│   │   ├── todos.test.ts       # Todo operations
│   │   └── tags.test.ts        # Tag operations
│   ├── rls/
│   │   └── isolation.test.ts   # RLS enforcement tests
│   └── trpc/
│       ├── auth.test.ts        # Auth router tests
│       ├── todos.test.ts       # Todos router tests
│       ├── tags.test.ts        # Tags router tests
│       ├── organizations.test.ts
│       └── tenants.test.ts     # Admin router tests
└── e2e/
    ├── auth/
    │   ├── signup.spec.ts
    │   ├── signin.spec.ts
    │   └── reset-password.spec.ts
    ├── routes/
    │   └── protected.spec.ts
    ├── organizations/
    │   └── management.spec.ts
    └── todos/
        ├── crud.spec.ts
        ├── filtering.spec.ts
        └── tags.spec.ts
```

## 7. Implementation Phases

### Phase 1: Test Infrastructure
- Create test helpers and utilities
- Set up test database configuration
- Configure Playwright
- Create test fixtures

### Phase 2: Unit Tests
- Auth library tests
- Session library tests
- Validation tests

### Phase 3: Integration Tests - Database
- Tenant operations
- User operations
- Todo operations
- Tag operations

### Phase 4: Integration Tests - RLS
- Tenant isolation tests
- Cross-tenant access prevention
- Context switching tests

### Phase 5: Integration Tests - tRPC
- Auth router tests
- Todos router tests
- Tags router tests
- Organizations router tests
- Tenants (admin) router tests

### Phase 6: E2E Tests - Auth
- Signup flow
- Signin flow
- Password reset flow
- Protected routes

### Phase 7: E2E Tests - Features
- Organization management
- Todo CRUD
- Filtering and search
- Tag management

### Phase 8: Unified Auth Verification
- Session auth tests
- API key auth tests
- Verify both methods work identically

## 8. Success Metrics

### Coverage Targets

| Category | Target Coverage |
|----------|----------------|
| Auth library | 100% |
| Session library | 100% |
| tRPC routers | 95% |
| RLS policies | 100% |
| User flows (E2E) | 100% |

### Quality Metrics

- Zero cross-tenant data leaks in testing
- All authentication methods work correctly
- All E2E tests pass reliably (no flaky tests)
- Tests complete in <5 minutes (CI)

## 9. Dependencies

- PostgreSQL running (Docker)
- MailHog running for email tests
- Next.js dev server for E2E tests
- Playwright browsers installed

## 10. Risks and Mitigations

**Risk**: E2E tests may be flaky
- **Mitigation**: Use proper wait conditions, retry logic, test isolation

**Risk**: Test database may diverge from production
- **Mitigation**: Run same migrations, use identical schema

**Risk**: Tests slow down development
- **Mitigation**: Fast unit tests, parallel test execution, CI caching

---

**Document Version**: 1.0
**Last Updated**: 2026-01-12
**Status**: Draft
