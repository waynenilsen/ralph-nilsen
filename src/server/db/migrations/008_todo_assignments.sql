-- Migration: Todo Assignments Table
-- Enables todo assignment and collaboration features

CREATE TABLE IF NOT EXISTS todo_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(todo_id, user_id)
);

-- Index for listing assignments by todo (for showing assignees on a todo)
CREATE INDEX IF NOT EXISTS idx_assignments_todo ON todo_assignments(todo_id);

-- Index for finding todos assigned to a user (for "Assigned to Me" view)
CREATE INDEX IF NOT EXISTS idx_assignments_user ON todo_assignments(user_id);

-- Index for tracking who assigned tasks (for audit/permissions)
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by ON todo_assignments(assigned_by);

-- Grant permissions to app_user
GRANT SELECT, INSERT, UPDATE, DELETE ON todo_assignments TO app_user;
