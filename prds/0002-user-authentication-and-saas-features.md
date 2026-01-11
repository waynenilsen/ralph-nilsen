# Product Requirements Document: User Authentication & SaaS Features

## 1. Executive Summary

This document extends the multi-tenant todo application with proper user authentication, self-service organization creation, and a complete SaaS user experience. This transforms the API-key-based kata into a production-ready multi-tenant SaaS application.

**Purpose**: Transform the educational kata into a fully functional SaaS application with user accounts, organizations, and proper authentication flows.

## 2. Goals and Objectives

### Primary Goals

- Implement user registration and authentication (email/password)
- Enable self-service organization creation
- Build session-based authentication (home-rolled, no external dependencies)
- Create marketing/landing page
- Implement password reset flow with email verification
- Add comprehensive E2E tests with Playwright

### Learning Objectives

- Build complete authentication flows from scratch
- Implement session management using PostgreSQL
- Design user-organization relationships
- Create email sending infrastructure (MailHog for local dev)
- Write comprehensive E2E tests

## 3. User Stories

### As a New User

- **US-1**: I can visit the homepage and see what the product does
- **US-2**: I can sign up with email, username, and password
- **US-3**: When I sign up, an organization is automatically created for me
- **US-4**: I can sign in with my email/username and password
- **US-5**: I can reset my password if I forget it
- **US-6**: I receive email verification when I sign up
- **US-7**: I receive email when I request password reset

### As an Authenticated User

- **US-8**: I can create additional organizations
- **US-9**: I can switch between my organizations
- **US-10**: I can see which organization I'm currently using
- **US-11**: I can sign out and return to the marketing page

## 4. Functional Requirements

### 4.1 User Management

- **FR-1**: Users table with: id, email (unique), username (unique), password_hash, email_verified, created_at, updated_at
- **FR-2**: Email addresses must be valid format and unique
- **FR-3**: Usernames must be unique, alphanumeric + underscore/hyphen, 3-30 chars
- **FR-4**: Passwords must be hashed using bcrypt (12+ rounds)
- **FR-5**: Email verification required before full access (optional for MVP, but infrastructure ready)

### 4.2 Organization/Tenant Management

- **FR-6**: Users can create organizations (tenants)
- **FR-7**: First organization created automatically on signup
- **FR-8**: User-organization relationship table: user_id, tenant_id, role (owner/member)
- **FR-9**: Users can belong to multiple organizations
- **FR-10**: Users can switch active organization (session-based)
- **FR-11**: Organization creator is automatically owner

### 4.3 Authentication & Sessions

- **FR-12**: Session-based authentication (no JWT, use PostgreSQL sessions table)
- **FR-13**: Sessions table: id, user_id, tenant_id (active org), session_token (random UUID), expires_at, created_at
- **FR-14**: Session tokens stored in HTTP-only cookies
- **FR-15**: Sessions expire after 30 days of inactivity (configurable)
- **FR-16**: Password reset tokens stored in database with expiration (1 hour)
- **FR-17**: All password operations use bcrypt

### 4.4 Pages & Routes

- **FR-18**: `/` - Marketing/landing page (public)
- **FR-19**: `/signup` - User registration page (public)
- **FR-20**: `/signin` - User login page (public)
- **FR-21**: `/reset-password` - Request password reset (public)
- **FR-22**: `/reset-password/:token` - Reset password with token (public)
- **FR-23**: `/app` - Main application (protected, redirects to todos)
- **FR-24**: `/app/todos` - Todo list (protected)
- **FR-25**: `/app/settings` - User settings (protected)
- **FR-26**: `/app/organizations` - Organization management (protected)

### 4.5 Email Functionality

- **FR-27**: Use MailHog for local email testing (SMTP server)
- **FR-28**: Email sending infrastructure ready for production (SMTP config)
- **FR-29**: Send welcome email on signup
- **FR-30**: Send password reset email with token link
- **FR-31**: Email templates stored in codebase (no external service)

### 4.6 Testing

- **FR-32**: Playwright E2E tests for all user flows
- **FR-33**: Test signup flow end-to-end
- **FR-34**: Test signin flow end-to-end
- **FR-35**: Test password reset flow end-to-end
- **FR-36**: Test organization creation and switching
- **FR-37**: Test session persistence
- **FR-38**: Test protected route access (redirects when not authenticated)

## 5. Technical Requirements

### 5.1 Database Schema

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(30) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### User-Tenant Relationship
```sql
CREATE TABLE user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);
```

#### Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    session_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Password Reset Tokens
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.2 Authentication Flow

#### Signup Flow
1. User fills signup form (email, username, password, confirm password)
2. Validate inputs (email format, username rules, password strength)
3. Check email/username uniqueness
4. Hash password with bcrypt
5. Create user record
6. Create default organization for user
7. Add user as owner of organization
8. Create session
9. Set session cookie
10. Send welcome email (async)
11. Redirect to `/app/todos`

#### Signin Flow
1. User fills signin form (email/username, password)
2. Find user by email or username
3. Compare password hash
4. Find user's default organization (or most recent)
5. Create session with organization context
6. Set session cookie
7. Redirect to `/app/todos`

#### Password Reset Flow
1. User requests reset on `/reset-password`
2. Generate reset token (UUID)
3. Store token in database with 1-hour expiration
4. Send email with reset link (`/reset-password/:token`)
5. User clicks link, enters new password
6. Validate token (exists, not expired, not used)
7. Hash new password
8. Update user password
9. Mark token as used
10. Invalidate all user sessions (force re-login)
11. Redirect to signin page

### 5.3 Session Management

- Session token stored in HTTP-only cookie: `session_token`
- Middleware validates session on protected routes
- Session includes `user_id` and `tenant_id` (active organization)
- RLS policies use session tenant_id for data isolation
- Sessions auto-expire after inactivity

### 5.4 Email Configuration

#### Local Development (MailHog)
- SMTP Host: `localhost`
- SMTP Port: `1025`
- No authentication required
- Web UI: `http://localhost:8025`

#### Production (Future)
- SMTP configuration via environment variables
- Support for SendGrid, AWS SES, etc.

### 5.5 API Endpoints

#### Authentication (tRPC)
- `auth.signup` - Create user account
- `auth.signin` - Authenticate user
- `auth.signout` - Destroy session
- `auth.me` - Get current user info
- `auth.requestPasswordReset` - Request password reset
- `auth.resetPassword` - Reset password with token

#### Organizations (tRPC)
- `organizations.list` - List user's organizations
- `organizations.create` - Create new organization
- `organizations.switch` - Switch active organization
- `organizations.getCurrent` - Get current active organization

### 5.6 Frontend Components

#### Public Pages
- `LandingPage` - Marketing homepage
- `SignupPage` - Registration form
- `SigninPage` - Login form
- `ResetPasswordPage` - Request reset form
- `ResetPasswordTokenPage` - Reset with token form

#### Protected Pages
- `AppLayout` - Main app layout with org switcher
- `TodosPage` - Todo list (existing)
- `SettingsPage` - User settings
- `OrganizationsPage` - Organization management

## 6. Testing Requirements

### 6.1 E2E Tests (Playwright)

#### Signup Flow
- Visit homepage
- Click "Sign Up"
- Fill signup form
- Submit form
- Verify redirect to app
- Verify organization created
- Verify welcome email in MailHog

#### Signin Flow
- Visit signin page
- Enter credentials
- Submit form
- Verify redirect to app
- Verify session cookie set

#### Password Reset Flow
- Visit reset password page
- Enter email
- Submit request
- Verify email in MailHog
- Extract reset token from email
- Visit reset URL with token
- Enter new password
- Submit form
- Verify redirect to signin
- Sign in with new password

#### Organization Management
- Create new organization
- Switch between organizations
- Verify todos are isolated per org
- Verify session persists org selection

#### Protected Routes
- Visit protected route without auth
- Verify redirect to signin
- Sign in
- Verify redirect back to original route

## 7. Implementation Constraints

- **No external auth services**: All authentication must be self-contained
- **PostgreSQL only**: Sessions stored in database, not Redis
- **MailHog for local**: Email testing via MailHog, production-ready SMTP config
- **Home-rolled sessions**: No JWT libraries, use PostgreSQL sessions table
- **Playwright for E2E**: Comprehensive test coverage

## 8. Success Criteria

- Users can sign up without admin intervention
- Users automatically get an organization
- Session-based auth works across page refreshes
- Password reset flow works end-to-end
- All E2E tests pass
- Email functionality verified via MailHog
- Multi-tenant isolation maintained with user-org model
