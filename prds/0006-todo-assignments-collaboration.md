# Product Requirements Document: Todo Assignments & Collaboration

## 1. Executive Summary

This document outlines requirements for adding todo assignment capabilities to the multi-tenant todo application. Users will be able to assign todos to specific team members, track assignments, and see their personal workload across organizations.

**Purpose**: Enable team members to assign work to each other and track who is responsible for which tasks, transforming the todo app into a true collaborative task management system.

**Status**: Draft

## 2. Goals and Objectives

### Primary Goals

- Enable users to assign todos to themselves or other organization members
- Add "Assigned to me" view showing all todos across organizations
- Support multiple assignees per todo
- Add assignment notifications via email
- Show assignment status on todo cards
- Filter todos by assignee

### Learning Objectives

- Implement many-to-many relationships (todos ↔ users)
- Design assignment UI/UX patterns
- Handle assignment permissions and notifications
- Build cross-organization personal dashboard

## 3. User Stories

### As an Organization Member

- **US-1**: I can assign a todo to myself or another member of my organization
- **US-2**: I can assign multiple people to the same todo
- **US-3**: I can remove assignments from a todo
- **US-4**: I can see who is assigned to each todo in the list view
- **US-5**: I can filter todos by assignee
- **US-6**: I receive email notifications when someone assigns me a todo
- **US-7**: I can see all todos assigned to me across all my organizations in one view

### As a Todo Assignee

- **US-8**: I see a badge/indicator on todos assigned to me
- **US-9**: I can access my "Assigned to me" dashboard from anywhere
- **US-10**: I can mark my assigned todos as complete
- **US-11**: I can see who else is assigned to the same todo

### As a Todo Creator

- **US-12**: I can assign people when creating a new todo
- **US-13**: I can change assignments after todo creation
- **US-14**: I can see assignment history (who was assigned and when)

## 4. Functional Requirements

### 4.1 Assignment System

- **FR-1**: Many-to-many relationship: one todo can have multiple assignees
- **FR-2**: Assignments table stores: todo_id, user_id, assigned_by, assigned_at
- **FR-3**: Only organization members can be assigned to todos
- **FR-4**: Any member can assign todos (no special permission required)
- **FR-5**: Assignees can unassign themselves
- **FR-6**: Todo creator or assignees can modify assignments

### 4.2 Assignment Notifications

- **FR-7**: Email notification sent when user is assigned to a todo
- **FR-8**: Email includes: todo title, description, due date, assigner name
- **FR-9**: Batch notifications for multiple assignments in short time period
- **FR-10**: Users can opt-out of assignment notifications (future: preferences)

### 4.3 Assignment Views & Filters

- **FR-11**: "Assigned to me" global view shows all assigned todos across orgs
- **FR-12**: Organization todo list can filter by assignee
- **FR-13**: Show avatar badges of assignees on todo cards
- **FR-14**: "Unassigned" filter shows todos with no assignees
- **FR-15**: "Assigned to me" badge on navigation

### 4.4 Assignment Management

- **FR-16**: Assignment picker shows all organization members
- **FR-17**: Quick-assign to self (one-click)
- **FR-18**: Bulk assignment operations (assign multiple todos to one person)
- **FR-19**: Assignment autocomplete by name or email
- **FR-20**: Show assignment count on todo ("3 people assigned")

## 5. Technical Requirements

### 5.1 Database Schema

#### Todo Assignments Table

```sql
CREATE TABLE todo_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(todo_id, user_id) -- Prevent duplicate assignments
);

CREATE INDEX idx_assignments_todo ON todo_assignments(todo_id);
CREATE INDEX idx_assignments_user ON todo_assignments(user_id);
CREATE INDEX idx_assignments_assigned_by ON todo_assignments(assigned_by);
```

### 5.2 API Endpoints (tRPC)

#### Todos Router Extensions

- `todos.assign` - Assign users to todo
  - Input: `{ todoId: string, userIds: string[] }`
  - Validates users are members of todo's organization
  - Sends notification emails
  - Returns: updated todo with assignees

- `todos.unassign` - Remove assignment
  - Input: `{ todoId: string, userId: string }`
  - Can unassign self or if you're the assigner
  - Returns: updated todo with assignees

- `todos.getAssignedToMe` - Get all todos assigned to current user
  - Returns: todos from all organizations with pagination
  - Includes organization name for context
  - Supports filtering by status, priority

- `todos.list` - Extended with assignee filter
  - New input: `assignedTo?: string` (user ID or "me" or "unassigned")
  - Returns todos with assignee information

#### Users Router (New)

- `users.getOrganizationMembers` - List members for assignment picker
  - Input: `{ organizationId?: string }` (defaults to current)
  - Returns: user info (id, name, email, avatar) for active members
  - Used by assignment autocomplete

### 5.3 Pages & Routes

- `/app/assigned` - Global "Assigned to me" dashboard (new route)
- Existing todo list pages get assignee filters

### 5.4 Email Templates

- `todo-assigned.tsx` - Assignment notification email
- `todo-unassigned.tsx` - Unassignment notification (optional)

### 5.5 Type Extensions

```typescript
// Extend Todo type
interface Todo {
  // ... existing fields
  assignees?: User[]; // Array of assigned users
  assigned_to_me?: boolean; // Helper flag for current user
}

// New type
interface TodoAssignment {
  id: string;
  todo_id: string;
  user_id: string;
  assigned_by: string;
  assigned_at: Date;
  assigner?: User; // Populated when needed
  assignee?: User; // Populated when needed
}

// Simplified user info for assignments
interface AssigneeUser {
  id: string;
  email: string;
  username: string;
}
```

## 6. UI Components

### 6.1 Assignment Picker Component

**Location**: `src/client/components/features/todos/AssignmentPicker.tsx`

**Features**:
- Multi-select dropdown with search
- Shows member avatars and names
- "Assign to me" quick button
- Shows current assignments with remove option
- Disabled state for non-members

### 6.2 Assignee Badges Component

**Location**: `src/client/components/features/todos/AssigneeBadges.tsx`

**Features**:
- Stack of avatar badges (max 3 visible, "+N more")
- Tooltip on hover shows full name
- Click opens assignment picker (if has permission)
- Empty state shows "Unassigned"

### 6.3 Assigned To Me Dashboard

**Location**: `src/app/assigned/page.tsx`

**Features**:
- List all todos assigned to current user
- Group by organization with headers
- Same filtering as todo list (status, priority, search)
- Show organization name and color
- Quick complete action
- Empty state with helpful message

### 6.4 Todo List Assignee Filter

**Extension of existing todo list**

**Features**:
- Dropdown filter: "All", "Assigned to me", "Unassigned", specific members
- Shows assignee avatars in list view
- Highlight todos assigned to current user

### 6.5 Todo Form Assignment Section

**Extension of create/edit todo forms**

**Features**:
- Assignment picker integrated into form
- Show assignments on edit
- Optional field (can create without assignees)

## 7. Implementation Phases

### Phase 1: Database & Core Infrastructure
- Create migration for todo_assignments table
- Add assignment types to shared types
- Create assignment validation helpers

### Phase 2: Backend - Assignment Operations
- Implement `todos.assign` endpoint
- Implement `todos.unassign` endpoint
- Extend `todos.list` to include assignee data
- Extend `todos.get` to include assignee data
- Add assignee filtering to list query

### Phase 3: Backend - Assigned To Me View
- Implement `todos.getAssignedToMe` endpoint
- Implement `users.getOrganizationMembers` endpoint
- Handle cross-organization query with RLS

### Phase 4: Email Notifications
- Create assignment email template
- Integrate email sending with assign operation
- Handle batch notifications

### Phase 5: UI - Assignment Components
- Create AssignmentPicker component
- Create AssigneeBadges component
- Integrate assignment picker into todo forms

### Phase 6: UI - Filters and Views
- Add assignee filter to existing todo lists
- Show assignee badges in todo list items
- Add assignment section to todo detail view

### Phase 7: UI - Assigned To Me Dashboard
- Create /app/assigned route and page
- Add navigation link/badge with count
- Implement cross-organization view

### Phase 8: Testing
- Unit tests for assignment logic
- Integration tests for assignment endpoints
- E2E tests for assignment flows
- Test RLS enforcement with assignments
- Test email notifications

## 8. Security Considerations

- **SEC-1**: Users can only assign todos in organizations they belong to
- **SEC-2**: Users can only assign other members of the same organization
- **SEC-3**: Assignees can view todos even without explicit org permissions
- **SEC-4**: RLS enforcement ensures assignments respect tenant boundaries
- **SEC-5**: Cannot assign deleted or suspended users
- **SEC-6**: Assignment notifications respect email preferences

## 9. Success Criteria

- Users can assign todos to organization members
- Multiple assignees per todo supported
- "Assigned to me" view shows all relevant todos
- Assignment notifications are sent
- Filters work correctly
- All tests pass
- Performance remains acceptable with assignment queries

## 10. Edge Cases & Considerations

### 10.1 Member Removal
- When member leaves organization, unassign their todos
- Send notification to remaining assignees
- Show "Former member" in assignment history

### 10.2 Organization Switching
- Assignments stay with organization context
- "Assigned to me" view aggregates across all orgs

### 10.3 Todo Deletion
- Assignments automatically cascade delete
- No notification needed

### 10.4 Performance
- Eager load assignees in list queries to avoid N+1
- Index on user_id for "assigned to me" queries
- Pagination for large assignment lists

### 10.5 Privacy
- Members can see all assignments within their organization
- Cannot see assignments in organizations they don't belong to

## 11. Future Enhancements (Out of Scope)

- Assignment permissions (only owner/admin can assign)
- Assignment requests (request to be assigned)
- Assignment workload balancing (show member capacity)
- Assignment time tracking
- Assignment approval workflow
- Due date reminders for assignees
- Re-assignment notifications
- Assignment analytics (who completes most tasks, etc.)

## 12. UI Mockups (Conceptual)

### Todo Card with Assignees
```
┌─────────────────────────────────────┐
│ ✓ Fix login bug                     │
│ Priority: High | Due: Today         │
│ [@avatar1] [@avatar2] [+2 more]     │  ← Assignee badges
└─────────────────────────────────────┘
```

### Assignment Picker
```
┌─────────────────────────────────┐
│ Assign to:                      │
│ ┌─────────────────────────────┐ │
│ │ [🔍] Search members...      │ │
│ └─────────────────────────────┘ │
│                                 │
│ [👤 Assign to me]   ← Quick btn │
│                                 │
│ ☑ [@] Alice Johnson            │ ← Selected
│ ☐ [@] Bob Smith                 │
│ ☑ [@] Charlie Brown            │ ← Selected
│ ☐ [@] Diana Prince              │
└─────────────────────────────────┘
```

### Assigned To Me Dashboard
```
┌─────────────────────────────────────────┐
│ Assigned to Me                          │
│                                         │
│ 🏢 Acme Corp (3 todos)                 │
│   ☐ Fix critical bug                   │
│   ☐ Update documentation               │
│   ☐ Review PR #123                     │
│                                         │
│ 🏢 Beta Inc (2 todos)                  │
│   ☐ Deploy to staging                  │
│   ☐ Test new feature                   │
└─────────────────────────────────────────┘
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-13
**Status**: Draft
**Dependencies**: PRD 0005 (Team Collaboration must be complete)
