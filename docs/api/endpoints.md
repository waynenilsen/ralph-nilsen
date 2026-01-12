# API Endpoints

This application uses [tRPC](https://trpc.io/) for the API layer. All endpoints are accessible via the tRPC client.

## Base URL

```
/api/trpc
```

## Authentication

### Tenant Authentication

All tenant endpoints require an API key in the Authorization header:

```
Authorization: Bearer tk_your_api_key_here
```

### Admin Authentication

Admin endpoints require the admin API key:

```
Authorization: Bearer your_admin_api_key
```

## Session Authentication

For user-based authentication, the app uses HTTP-only cookies:

- Cookie name: `session_token`
- Contains UUID session token
- Expires after 30 days of inactivity

## Health Check

### `health`

Check system health status.

**Authentication**: None required

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "database": "connected"
}
```

## Tenant Management (Admin)

### `tenants.list`

List all tenants.

**Authentication**: Admin API key required

**Response**: Array of tenants

### `tenants.get`

Get a specific tenant.

**Input**:
```json
{ "id": "uuid" }
```

### `tenants.create`

Create a new tenant.

**Input**:
```json
{
  "name": "Company Name",
  "slug": "company-slug"
}
```

**Response**:
```json
{
  "tenant": { "id": "uuid", "name": "...", "slug": "...", ... },
  "apiKey": "tk_generated_api_key"
}
```

### `tenants.update`

Update a tenant.

**Input**:
```json
{
  "id": "uuid",
  "data": {
    "name": "New Name",
    "is_active": true
  }
}
```

### `tenants.delete`

Delete a tenant.

**Input**:
```json
{ "id": "uuid" }
```

### `tenants.stats`

Get tenant statistics.

**Input**:
```json
{ "id": "uuid" }
```

**Response**:
```json
{
  "todos": { "total": 10, "pending": 5, "completed": 5 },
  "tags": 3,
  "activeApiKeys": 1
}
```

### `tenants.createApiKey`

Create a new API key for a tenant.

**Input**:
```json
{
  "tenantId": "uuid",
  "name": "Key Name",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

## Todos

### `todos.list`

List todos with filtering and pagination.

**Input**:
```json
{
  "page": 1,
  "limit": 20,
  "status": "pending",
  "priority": "high",
  "tag": "tag-uuid",
  "due_before": "2024-12-31T23:59:59Z",
  "due_after": "2024-01-01T00:00:00Z",
  "search": "search term"
}
```

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### `todos.get`

Get a specific todo.

**Input**:
```json
{ "id": "uuid" }
```

### `todos.create`

Create a new todo.

**Input**:
```json
{
  "title": "Todo title",
  "description": "Optional description",
  "status": "pending",
  "priority": "medium",
  "due_date": "2024-12-31T23:59:59Z",
  "tag_ids": ["tag-uuid-1", "tag-uuid-2"]
}
```

### `todos.update`

Update a todo.

**Input**:
```json
{
  "id": "uuid",
  "data": {
    "title": "Updated title",
    "status": "completed",
    "tag_ids": ["tag-uuid"]
  }
}
```

### `todos.delete`

Delete a todo.

**Input**:
```json
{ "id": "uuid" }
```

### `todos.addTag`

Add a tag to a todo.

**Input**:
```json
{
  "todoId": "uuid",
  "tagId": "uuid"
}
```

### `todos.removeTag`

Remove a tag from a todo.

**Input**:
```json
{
  "todoId": "uuid",
  "tagId": "uuid"
}
```

## Tags

### `tags.list`

List all tags for the tenant.

### `tags.get`

Get a specific tag.

**Input**:
```json
{ "id": "uuid" }
```

### `tags.create`

Create a new tag.

**Input**:
```json
{
  "name": "Tag Name",
  "color": "#ff0000"
}
```

### `tags.update`

Update a tag.

**Input**:
```json
{
  "id": "uuid",
  "data": {
    "name": "New Name",
    "color": "#00ff00"
  }
}
```

### `tags.delete`

Delete a tag.

**Input**:
```json
{ "id": "uuid" }
```

### `tags.getTodos`

Get all todos with a specific tag.

**Input**:
```json
{ "tagId": "uuid" }
```

## Authentication (Session-based)

### `auth.signup`

Register a new user account.

**Authentication**: None required

**Input**:
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword",
  "confirmPassword": "securepassword"
}
```

**Response**:
```json
{
  "user": { "id": "uuid", "email": "...", "username": "...", ... },
  "tenant": { "id": "uuid", "name": "...", ... },
  "sessionToken": "uuid"
}
```

### `auth.signin`

Sign in to an existing account.

**Authentication**: None required

**Input**:
```json
{
  "identifier": "user@example.com",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "user": { "id": "uuid", "email": "...", "username": "...", ... },
  "tenant": { "id": "uuid", "name": "...", ... },
  "sessionToken": "uuid"
}
```

### `auth.signout`

Sign out and destroy the session.

**Authentication**: Session cookie required

**Response**:
```json
{ "success": true }
```

### `auth.me`

Get the current user's information.

**Authentication**: Session cookie required

**Response**:
```json
{
  "user": { "id": "uuid", "email": "...", "username": "...", ... },
  "tenant": { "id": "uuid", "name": "...", ... }
}
```

### `auth.requestPasswordReset`

Request a password reset email.

**Authentication**: None required

**Input**:
```json
{ "email": "user@example.com" }
```

**Response**:
```json
{ "success": true }
```

### `auth.validateResetToken`

Check if a password reset token is valid.

**Authentication**: None required

**Input**:
```json
{ "token": "uuid" }
```

**Response**:
```json
{ "valid": true }
```

### `auth.resetPassword`

Reset password using a token.

**Authentication**: None required

**Input**:
```json
{
  "token": "uuid",
  "password": "newpassword",
  "confirmPassword": "newpassword"
}
```

**Response**:
```json
{ "success": true }
```

## Organizations

### `organizations.list`

List all organizations the user belongs to.

**Authentication**: Session cookie required

**Response**: Array of user organizations with tenant details

### `organizations.create`

Create a new organization.

**Authentication**: Session cookie required

**Input**:
```json
{ "name": "Organization Name" }
```

**Response**:
```json
{
  "tenant": { "id": "uuid", "name": "...", ... },
  "role": "owner"
}
```

### `organizations.switch`

Switch the active organization for the current session.

**Authentication**: Session cookie required

**Input**:
```json
{ "tenantId": "uuid" }
```

**Response**:
```json
{
  "tenant": { "id": "uuid", "name": "...", ... }
}
```

### `organizations.getCurrent`

Get the currently active organization.

**Authentication**: Session cookie required

**Response**:
```json
{
  "tenant": { "id": "uuid", "name": "...", ... }
}
```
