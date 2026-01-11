-- Row-Level Security policies for multi-tenant isolation

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS tenant_isolation_todos ON todos;
CREATE POLICY tenant_isolation_todos ON todos
    FOR ALL USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_tags ON tags;
CREATE POLICY tenant_isolation_tags ON tags
    FOR ALL USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_todo_tags ON todo_tags;
CREATE POLICY tenant_isolation_todo_tags ON todo_tags
    FOR ALL USING (
        EXISTS (SELECT 1 FROM todos WHERE todos.id = todo_tags.todo_id AND todos.tenant_id = current_tenant_id())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM todos WHERE todos.id = todo_tags.todo_id AND todos.tenant_id = current_tenant_id())
    );

DROP POLICY IF EXISTS tenant_isolation_api_keys ON api_keys;
CREATE POLICY tenant_isolation_api_keys ON api_keys
    FOR ALL USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
