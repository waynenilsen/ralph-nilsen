# Multi-Tenancy Architecture

## Overview

This application implements multi-tenancy using PostgreSQL Row-Level Security (RLS) with a shared schema approach.

## Strategy: Shared Schema with RLS

All tenants share the same database schema. Data isolation is enforced at the database level using PostgreSQL's Row-Level Security feature.

### Advantages

- **Simple to maintain**: Single schema for all tenants
- **Efficient**: No schema duplication overhead
- **Strong security**: Database-level enforcement
- **Easy migrations**: One migration applies to all tenants
- **Cross-tenant analytics**: Possible when needed (with admin access)

### Trade-offs

- All tenants share database resources
- Noisy neighbor potential (mitigated by proper indexing)
- Single point of failure for database

## Implementation

### 1. Tenant Identification

Each request includes a tenant API key in the Authorization header:

```
Authorization: Bearer tk_your_api_key_here
```

The API key is validated against the `api_keys` table, and the associated `tenant_id` is extracted.

### 2. Tenant Context Setting

Before executing any database query, the tenant context is set:

```typescript
async function withTenantContext<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('SET app.current_tenant_id = $1', [tenantId]);
    return await callback(client);
  } finally {
    await client.query('RESET app.current_tenant_id');
    client.release();
  }
}
```

### 3. RLS Policy Enforcement

PostgreSQL RLS policies automatically filter queries:

```sql
CREATE POLICY tenant_isolation_todos ON todos
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
```

This means:
- SELECT queries only return rows where `tenant_id` matches
- INSERT/UPDATE queries can only affect matching rows
- No application code changes needed for filtering

### 4. Request Flow

```
1. Request arrives with API key
2. Middleware validates API key
3. Tenant ID extracted from API key
4. Tenant context set in PostgreSQL session
5. Query executed (RLS filters automatically)
6. Tenant context cleared
7. Response returned
```

## Security Considerations

### Database Level

- RLS is enabled on all tenant-scoped tables
- Policies use `WITH CHECK` to prevent cross-tenant writes
- Tenant context is always reset after queries

### Application Level

- API keys are bcrypt hashed
- Tenant ID comes from validated API key, not user input
- Admin endpoints require separate authentication

### Best Practices

1. **Never trust client-provided tenant IDs**
   - Always derive tenant ID from authenticated API key

2. **Always use parameterized queries**
   - Prevents SQL injection

3. **Reset tenant context in finally blocks**
   - Ensures no context leakage between requests

4. **Use transactions for multi-step operations**
   - Maintains consistency within tenant context

## Testing Tenant Isolation

Integration tests should verify:

1. Tenant A cannot see Tenant B's data
2. Tenant A cannot modify Tenant B's data
3. Invalid API keys are rejected
4. Expired API keys are rejected
5. Inactive tenants cannot access data

Example test:

```typescript
it('should not return todos from other tenants', async () => {
  // Create todos for tenant A
  await createTodoForTenant(tenantAId, 'Tenant A Todo');

  // Query as tenant B
  const todos = await withTenantContext(tenantBId, async (client) => {
    const { rows } = await client.query('SELECT * FROM todos');
    return rows;
  });

  // Should not see tenant A's todos
  expect(todos).toHaveLength(0);
});
```
