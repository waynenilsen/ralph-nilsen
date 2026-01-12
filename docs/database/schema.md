# Database Schema

## Overview

The application uses PostgreSQL with Row-Level Security (RLS) for multi-tenant data isolation.

## Tables

### tenants

Stores tenant (organization) information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Tenant display name |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | URL-friendly identifier |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |
| is_active | BOOLEAN | DEFAULT TRUE | Whether tenant is active |

### todos

Stores todo items for each tenant.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | FK -> tenants(id), NOT NULL | Owner tenant |
| title | VARCHAR(255) | NOT NULL | Todo title |
| description | TEXT | | Optional description |
| status | VARCHAR(20) | CHECK IN ('pending', 'completed'), DEFAULT 'pending' | Todo status |
| priority | VARCHAR(20) | CHECK IN ('low', 'medium', 'high'), DEFAULT 'medium' | Priority level |
| due_date | TIMESTAMPTZ | | Optional due date |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_todos_tenant_id` on (tenant_id)
- `idx_todos_status` on (tenant_id, status)
- `idx_todos_priority` on (tenant_id, priority)
- `idx_todos_due_date` on (tenant_id, due_date)
- `idx_todos_title_search` GIN on to_tsvector('english', title)
- `idx_todos_description_search` GIN on to_tsvector('english', description)

### tags

Stores tags for organizing todos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | FK -> tenants(id), NOT NULL | Owner tenant |
| name | VARCHAR(100) | NOT NULL | Tag name |
| color | VARCHAR(7) | | Hex color code |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Constraints**:
- UNIQUE(tenant_id, name) - Tag names are unique per tenant

**Indexes**:
- `idx_tags_tenant_id` on (tenant_id)

### todo_tags

Junction table for many-to-many relationship between todos and tags.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| todo_id | UUID | FK -> todos(id), PK | Todo reference |
| tag_id | UUID | FK -> tags(id), PK | Tag reference |

**Indexes**:
- `idx_todo_tags_tag_id` on (tag_id)

### api_keys

Stores API keys for tenant authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | FK -> tenants(id), NOT NULL | Owner tenant |
| key_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed API key |
| name | VARCHAR(255) | | Optional key name/description |
| last_used_at | TIMESTAMPTZ | | Last usage timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| expires_at | TIMESTAMPTZ | | Optional expiration date |
| is_active | BOOLEAN | DEFAULT TRUE | Whether key is active |

**Indexes**:
- `idx_api_keys_key_hash` on (key_hash)
- `idx_api_keys_tenant_id` on (tenant_id)

## Row-Level Security

RLS policies ensure tenants can only access their own data.

### current_tenant_id() Function

```sql
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

### RLS Policies

All tenant-scoped tables (todos, tags, todo_tags, api_keys) have RLS enabled with policies that filter by `current_tenant_id()`.

Example policy for todos:

```sql
CREATE POLICY tenant_isolation_todos ON todos
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
```

### Setting Tenant Context

Before executing queries, the application sets the tenant context:

```sql
SET app.current_tenant_id = 'tenant-uuid';
```

This is handled automatically by the `withTenantContext()` function in the application code.

### users

Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| username | VARCHAR(30) | UNIQUE, NOT NULL | Username for login |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| email_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints**:
- Username must match pattern `^[a-zA-Z0-9_-]{3,30}$`

**Indexes**:
- `idx_users_email` on (email)
- `idx_users_username` on (username)

### user_tenants

Junction table for user-organization membership.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK -> users(id), NOT NULL | User reference |
| tenant_id | UUID | FK -> tenants(id), NOT NULL | Organization reference |
| role | VARCHAR(20) | CHECK IN ('owner', 'member', 'admin'), DEFAULT 'member' | User's role in org |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Constraints**:
- UNIQUE(user_id, tenant_id) - User can only have one role per organization

**Indexes**:
- `idx_user_tenants_user_id` on (user_id)
- `idx_user_tenants_tenant_id` on (tenant_id)

### sessions

Stores user session information for authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK -> users(id), NOT NULL | User reference |
| tenant_id | UUID | FK -> tenants(id), SET NULL on delete | Active organization |
| session_token | UUID | UNIQUE, NOT NULL, DEFAULT gen_random_uuid() | Session identifier |
| expires_at | TIMESTAMPTZ | NOT NULL | Session expiration time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes**:
- `idx_sessions_user_id` on (user_id)
- `idx_sessions_session_token` on (session_token)
- `idx_sessions_expires_at` on (expires_at)

### password_reset_tokens

Stores tokens for password reset flow.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK -> users(id), NOT NULL | User reference |
| token | UUID | UNIQUE, NOT NULL, DEFAULT gen_random_uuid() | Reset token |
| expires_at | TIMESTAMPTZ | NOT NULL | Token expiration time |
| used_at | TIMESTAMPTZ | | When token was used |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes**:
- `idx_password_reset_tokens_token` on (token)
- `idx_password_reset_tokens_user_id` on (user_id)

## Triggers

### update_updated_at_column

Automatically updates the `updated_at` column on row updates:

```sql
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```
