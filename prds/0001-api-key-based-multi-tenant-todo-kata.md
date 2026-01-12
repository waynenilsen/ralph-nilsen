# Product Requirements Document: Multi-Tenant Todo Kata

## 1. Executive Summary

This document outlines the requirements for a multi-tenant todo application designed as a coding kata. The application will demonstrate best practices for building secure, scalable multi-tenant systems using PostgreSQL as the backend database.

**Purpose**: Educational kata to practice multi-tenancy patterns, database design, and API security.

## 2. Goals and Objectives

### Primary Goals

- Implement a fully functional multi-tenant todo application
- Demonstrate secure tenant isolation at the database level
- Practice PostgreSQL row-level security (RLS) patterns
- Build RESTful APIs with proper tenant context handling
- Learn tenant data isolation strategies

### Learning Objectives

- Understand multi-tenancy architecture patterns
- Implement tenant isolation using PostgreSQL RLS
- Design secure APIs that prevent cross-tenant data access
- Handle tenant context propagation through application layers
- Design efficient database schemas for multi-tenant applications

## 3. User Stories

### As a Tenant User

- **US-1**: I can create, read, update, and delete my own todos
- **US-2**: I can organize todos with categories/tags
- **US-3**: I can mark todos as complete/incomplete
- **US-4**: I can filter and search my todos
- **US-5**: I cannot see or access todos from other tenants

### As a System Administrator

- **US-6**: I can create new tenants
- **US-7**: I can view tenant usage statistics
- **US-8**: I can manage tenant accounts (activate/deactivate)

## 4. Functional Requirements

### 4.1 Tenant Management

- **FR-1**: System must support multiple tenants
- **FR-2**: Each tenant must have a unique identifier (tenant_id)
- **FR-3**: Tenant data must be completely isolated from other tenants
- **FR-4**: Tenant context must be determined from authentication token/header

### 4.2 Todo Management

- **FR-5**: Users can create todos with:
  - Title (required, max 255 characters)
  - Description (optional, text)
  - Status (pending, completed)
  - Priority (low, medium, high)
  - Due date (optional)
  - Tags/categories (optional, multiple)
- **FR-6**: Users can update any field of their todos
- **FR-7**: Users can delete their todos
- **FR-8**: Users can list todos with pagination
- **FR-9**: Users can filter todos by:
  - Status
  - Priority
  - Tags
  - Due date range
- **FR-10**: Users can search todos by title/description

### 4.3 Data Isolation

- **FR-11**: All database queries must automatically filter by tenant_id
- **FR-12**: No API endpoint should allow cross-tenant data access
- **FR-13**: Database-level enforcement of tenant isolation (RLS)

### 4.4 System Constraints

- **FR-14**: System must have **NO external dependencies** other than PostgreSQL
- **FR-15**: **NO external services** may be used for any functionality (authentication, authorization, caching, queuing, etc.)
- **FR-16**: All authentication and authorization must be implemented internally using PostgreSQL
- **FR-17**: No third-party authentication providers (OAuth, Auth0, etc.)
- **FR-18**: No external caching services (Redis, Memcached, etc.)
- **FR-19**: No external message queues or background job services
- **FR-20**: All application logic must be self-contained within the application and database

### 4.5 Documentation Workflow

- **FR-26**: **Document as you go**: Documentation must be created/updated during feature development, not deferred to later
- **FR-27**: **Check existing docs first**: Before writing new documentation, check `./docs` folder for existing related documentation
- **FR-28**: If `./docs` folder doesn't exist, create it (it may not exist initially when starting the project)
- **FR-29**: Update existing documentation files when modifying documented features or APIs
- **FR-30**: All documentation files must be stored in the `./docs` folder

## 5. Technical Requirements

### 5.1 Database Architecture

#### Multi-Tenancy Strategy

**Selected Pattern**: Row-Level Security (RLS) with shared schema

**Rationale**:

- Simpler to maintain than separate schemas/databases
- Efficient for moderate tenant counts
- PostgreSQL RLS provides strong security guarantees
- Easier to implement cross-tenant analytics if needed

#### Database Schema

**Tenants Table**

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
```

**Todos Table**

```sql
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_todos_tenant_id ON todos(tenant_id);
CREATE INDEX idx_todos_status ON todos(tenant_id, status);
CREATE INDEX idx_todos_due_date ON todos(tenant_id, due_date);
```

**Tags Table** (for many-to-many relationship)

```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name),
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE todo_tags (
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
);

CREATE INDEX idx_tags_tenant_id ON tags(tenant_id);
```

**API Keys Table** (for self-contained authentication)

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL, -- hashed API key (use bcrypt or similar)
    name VARCHAR(255), -- optional name/description for the key
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- optional expiration
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
```

#### Row-Level Security Policies

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_tags ENABLE ROW LEVEL SECURITY;

-- Create policy function to get current tenant
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', TRUE)::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Todos RLS policies
CREATE POLICY tenant_isolation_todos ON todos
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Tags RLS policies
CREATE POLICY tenant_isolation_tags ON tags
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Todo_tags RLS policies (indirect tenant check via todo)
CREATE POLICY tenant_isolation_todo_tags ON todo_tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM todos
            WHERE todos.id = todo_tags.todo_id
            AND todos.tenant_id = current_tenant_id()
        )
    );
```

### 5.2 API Design

#### Authentication & Tenant Context

**Constraint**: All authentication must be self-contained. No external authentication services allowed.

- **API Key Authentication**: Each tenant has an API key stored in PostgreSQL
- **API Keys Table**: Store API keys in `api_keys` table with tenant_id relationship
- **Header-based tenant identification**: `X-Tenant-ID` header (validated against API key)
- **API Key Validation**: Validate API key against database on each request
- **JWT Alternative** (if implemented): Must be self-contained, signed/validated using application secrets (no external JWT services)

#### REST Endpoints

**Tenant Management** (Admin only)

- `POST /api/admin/tenants` - Create tenant
- `GET /api/admin/tenants` - List tenants
- `GET /api/admin/tenants/:id` - Get tenant details
- `PATCH /api/admin/tenants/:id` - Update tenant
- `DELETE /api/admin/tenants/:id` - Delete tenant

**Todos**

- `GET /api/todos` - List todos (with filters, pagination)
  - Query params: `status`, `priority`, `tag`, `due_before`, `due_after`, `search`, `page`, `limit`
- `GET /api/todos/:id` - Get single todo
- `POST /api/todos` - Create todo
- `PATCH /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo

**Tags**

- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag
- `PATCH /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag
- `POST /api/todos/:id/tags` - Add tag to todo
- `DELETE /api/todos/:id/tags/:tagId` - Remove tag from todo

#### Request/Response Examples

**Create Todo**

```json
POST /api/todos
Headers: X-Tenant-ID: <tenant-uuid>, Authorization: Bearer <api-key>

{
  "title": "Complete PRD",
  "description": "Finish the product requirements document",
  "priority": "high",
  "due_date": "2024-12-31T23:59:59Z",
  "tag_ids": ["tag-uuid-1", "tag-uuid-2"]
}

Response: 201 Created
{
  "id": "todo-uuid",
  "tenant_id": "tenant-uuid",
  "title": "Complete PRD",
  "description": "Finish the product requirements document",
  "status": "pending",
  "priority": "high",
  "due_date": "2024-12-31T23:59:59Z",
  "tags": [...],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**List Todos**

```json
GET /api/todos?status=pending&priority=high&page=1&limit=20
Headers: X-Tenant-ID: <tenant-uuid>, Authorization: Bearer <api-key>

Response: 200 OK
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### 5.3 Application Architecture

#### Middleware Stack

1. **Authentication Middleware**: Validate API key and extract tenant_id
2. **Tenant Context Middleware**: Set `app.current_tenant_id` in PostgreSQL session
3. **Error Handling Middleware**: Standardized error responses
4. **Validation Middleware**: Request validation

#### Database Connection Handling

- Use PostgreSQL connection pool
- Set tenant context per request: `SET app.current_tenant_id = '<tenant-id>'`
- Ensure context is cleared after request
- Use transaction isolation to prevent context leakage

### 5.4 Technology Stack Recommendations

**Backend Options:**

- Node.js/Express or Fastify
- Python/Flask or FastAPI
- Go/Gin or Echo
- Ruby on Rails

**Database:**

- PostgreSQL 12+ (for RLS support)

**Additional Tools:**

- Database migration tool (e.g., Flyway, Alembic, Knex)
- API testing tool (Postman, Insomnia)
- Load testing tool (k6, Apache Bench)

### 5.5 Dependency Constraints

**CRITICAL CONSTRAINT**: The application must be self-contained with **ONLY PostgreSQL as an external dependency**.

#### Allowed Dependencies

- **PostgreSQL**: The only external service/dependency allowed
- **Application runtime**: Language runtime (Node.js, Python, Go, etc.)
- **Standard library**: Language standard library only
- **Database driver**: PostgreSQL client library for the chosen language

#### Prohibited Dependencies

- ❌ **External authentication services**: No Auth0, Firebase Auth, AWS Cognito, OAuth providers, etc.
- ❌ **External caching services**: No Redis, Memcached, etc.
- ❌ **Message queues**: No RabbitMQ, AWS SQS, etc.
- ❌ **Background job processors**: No Celery, Sidekiq, etc.
- ❌ **External storage**: No S3, Cloud Storage, etc.
- ❌ **External logging services**: No Datadog, Loggly, etc. (use file/stdout logging)
- ❌ **External monitoring**: No external APM services
- ❌ **Third-party APIs**: No external service integrations

#### Implementation Requirements

- **FR-21**: API keys must be stored in PostgreSQL `api_keys` table
- **FR-22**: Authentication logic must be implemented in application code
- **FR-23**: Session management (if needed) must use PostgreSQL or in-memory storage
- **FR-24**: All business logic must execute within the application process
- **FR-25**: Logging must be to files or stdout (no external log aggregation)

## 6. Security Requirements

### 6.1 Tenant Isolation

- **SEC-1**: Database RLS policies must be enabled and tested
- **SEC-2**: Application must never allow tenant_id override via API
- **SEC-3**: All queries must use parameterized statements
- **SEC-4**: Tenant context must be validated before database operations

### 6.2 Authentication & Authorization

**Constraint**: All authentication must be self-contained using PostgreSQL. No external auth services.

- **SEC-5**: API keys must be stored and validated from PostgreSQL `api_keys` table
- **SEC-6**: API keys must be scoped to specific tenants
- **SEC-7**: Admin endpoints require separate admin authentication (stored in PostgreSQL)
- **SEC-8**: Rate limiting per tenant to prevent abuse (implemented in application code, no external services)
- **SEC-13**: API keys must be hashed using secure hashing algorithm (bcrypt, argon2, etc.)
- **SEC-14**: Password/API key hashing must use application libraries (no external services)
- **SEC-15**: All authentication logic must execute within application process

### 6.3 Data Protection

- **SEC-9**: Sensitive data should be encrypted at rest (if storing PII)
- **SEC-10**: Use HTTPS for all API communications
- **SEC-11**: Implement input validation and sanitization
- **SEC-12**: Log security events (failed auth attempts, etc.)

## 7. Non-Functional Requirements

### 7.1 Performance

- **NFR-1**: API response time < 200ms for simple queries (p95)
- **NFR-2**: Support at least 1000 tenants
- **NFR-3**: Support 10,000 todos per tenant
- **NFR-4**: Database queries should use appropriate indexes

### 7.2 Scalability

- **NFR-5**: Design should support horizontal scaling
- **NFR-6**: Database connection pooling required
- **NFR-7**: Consider read replicas for high read workloads

### 7.3 Reliability

- **NFR-8**: Database transactions for data consistency
- **NFR-9**: Proper error handling and logging
- **NFR-10**: Health check endpoints

### 7.4 Maintainability

- **NFR-11**: Clear code structure and documentation
- **NFR-12**: Database migrations versioned
- **NFR-13**: Comprehensive test coverage (unit + integration)

### 7.5 Documentation Requirements

- **NFR-14**: All documentation must be stored in the `./docs` folder
- **NFR-15**: **Document as you go**: Documentation must be created/updated during development, not after
- **NFR-16**: **Check existing docs first**: Before creating new documentation, developers must check `./docs` folder for existing related documentation
- **NFR-17**: Update existing documentation when making changes to documented features
- **NFR-18**: Documentation should include:
  - API endpoint documentation
  - Database schema and migration notes
  - Architecture decisions and rationale
  - Setup and deployment instructions
  - Troubleshooting guides
  - Code examples and usage patterns
- **NFR-19**: Use Markdown format for all documentation files
- **NFR-20**: Keep documentation up-to-date with code changes
- **NFR-21**: If `./docs` folder doesn't exist, create it (it may not exist initially)

## 8. Testing Requirements

### 8.1 Unit Tests

- Test tenant context extraction
- Test data access layer with mocked tenant context
- Test business logic isolation

### 8.2 Integration Tests

- Test RLS policies prevent cross-tenant access
- Test API endpoints with different tenant contexts
- Test tenant isolation edge cases

### 8.3 Security Tests

- Attempt cross-tenant data access (should fail)
- Test SQL injection prevention
- Test tenant_id manipulation attempts

## 9. Success Metrics

### Functional Metrics

- ✅ All CRUD operations work correctly
- ✅ Zero cross-tenant data leaks in testing
- ✅ All RLS policies enforced

### Performance Metrics

- API response times meet NFR-1
- Database query performance acceptable
- No N+1 query problems

### Code Quality Metrics

- Test coverage > 80%
- All security tests pass
- Code follows best practices

## 10. Implementation Phases

### Phase 1: Foundation

- Set up database schema
- Implement RLS policies
- Create basic CRUD APIs for todos
- Basic authentication
- **Documentation**: Create `./docs` folder structure, document database schema, RLS policies, and API endpoints

### Phase 2: Enhanced Features

- Add tags functionality
- Implement filtering and search
- Add pagination
- Error handling improvements
- **Documentation**: Document new features, update API documentation, add usage examples

### Phase 3: Security & Testing

- Comprehensive security testing
- Load testing
- Performance optimization
- **Documentation**: Complete all documentation, add troubleshooting guides, document testing strategies

## 11. Open Questions / Future Considerations

- Should we support tenant-to-tenant data sharing?
- Do we need audit logging for compliance?
- Should we implement soft deletes?
- Do we need full-text search capabilities?
- Should we support webhooks for todo events?
- Do we need a web UI or API-only?

## 12. References

- PostgreSQL Row-Level Security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Multi-tenancy patterns: https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns
- OWASP Multi-Tenancy Security: https://owasp.org/www-community/Multi-Tenancy

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Status**: Draft
