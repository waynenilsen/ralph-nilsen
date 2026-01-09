# Product Issue Management Guide

## Overview

This guide covers how to create high-quality GitHub Issues and organize them into epics using the GitHub CLI (`gh`). Well-structured issues are essential for effective development workflows and ensure engineering teams have all the context they need.

## Creating Good Issues

### Issue Structure

A good issue should include:

1. **Clear Title**: Descriptive and specific
2. **Problem Statement**: What problem are we solving?
3. **User Story**: Who needs this and why?
4. **Acceptance Criteria**: How do we know it's done?
5. **Edge Cases**: What scenarios need special handling?
6. **Technical Guidance**: Files to modify, implementation approach
7. **Best Practices**: Testing requirements, code quality standards
8. **Dependencies**: Related issues or blockers

### Issue Template

```markdown
## Problem Statement
[Clear description of the problem this issue solves]

## User Story
As a [user type], I want [goal] so that [benefit]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Edge Cases
- [Edge case 1 and how to handle it]
- [Edge case 2 and how to handle it]
- [Edge case 3 and how to handle it]

## Technical Guidance

### Files to Modify
- `path/to/file1.js` - [How it should be modified]
- `path/to/file2.js` - [How it should be modified]
- `path/to/file3.test.js` - [New test file to create]

### Implementation Approach
[High-level approach or architecture considerations]

## Best Practices
- [ ] Add unit tests (target coverage: >80%)
- [ ] Add integration tests for API endpoints
- [ ] Follow existing code patterns
- [ ] Update documentation
- [ ] Ensure type checking passes
- [ ] Ensure formatting and linting pass
- [ ] Add error handling
- [ ] Consider performance implications

## Dependencies
- Blocks: #[issue-number]
- Blocked by: #[issue-number]
- Related to: #[issue-number]

## Additional Context
[Any other relevant information, mockups, examples, etc.]
```

## Creating Issues with GitHub CLI

### Basic Issue Creation

```bash
# Create a simple issue
gh issue create \
  --title "Feature: User authentication" \
  --body "Add session-based user authentication with email/password"

# Create issue from file
gh issue create \
  --title "Feature: Task CRUD operations" \
  --body-file issue-template.md

# Create issue with labels
gh issue create \
  --title "Bug: Login fails with invalid credentials" \
  --body "..." \
  --label "bug,high-priority"
```

### Creating Issues with Full Template

```bash
# Create issue with all details
gh issue create \
  --title "Feature: Add task filtering" \
  --body "## Problem Statement
Users need to filter tasks by status and priority to manage their workload effectively.

## User Story
As a user, I want to filter tasks by status and priority so that I can focus on what's most important.

## Acceptance Criteria
- [ ] `task.list` procedure accepts status filter and returns filtered tasks
- [ ] `task.list` procedure accepts priority filter and returns filtered tasks
- [ ] Multiple filters can be combined in `task.list`
- [ ] Invalid filter values return validation error via tRPC

## Edge Cases
- Empty filter results: Return empty array, not error
- Invalid status values: Return 400 with clear error message
- Invalid priority values: Return 400 with clear error message
- SQL injection attempts: Sanitize inputs, return 400
- Very large result sets: Implement pagination (limit 100 per page)

## Technical Guidance

### Files to Modify
- \`src/server/api/trpc/task.ts\` - Add filter input to task.list procedure with Zod validation
- \`prisma/schema.prisma\` - Add indexes for status and priority fields if needed
- \`tests/task.test.ts\` - Add tests for all filter combinations
- \`docs/api.md\` - Update API documentation

### Implementation Approach
1. Add filter input schema to task.list procedure using Zod
2. Update Prisma query to filter by status/priority
3. Add database indexes for performance if needed
4. Add comprehensive tests using tRPC testing utilities
5. Update API documentation

## Best Practices
- [ ] Add unit tests for filter logic (target coverage: >80%)
- [ ] Add integration tests for all filter combinations
- [ ] Follow existing validation patterns
- [ ] Update API documentation
- [ ] Ensure type checking passes
- [ ] Ensure formatting and linting pass
- [ ] Add error handling for invalid inputs
- [ ] Consider performance (add database indexes if needed)

## Dependencies
- Related to: #123 (Task CRUD operations)
- Blocks: #125 (Task search feature)

## Additional Context
See API design doc: docs/api-design.md"
```

### Issue Types and Labels

```bash
# Feature issue
gh issue create \
  --title "Feature: [description]" \
  --body "..." \
  --label "enhancement,feature"

# Bug issue
gh issue create \
  --title "Bug: [description]" \
  --body "..." \
  --label "bug,high-priority"

# Technical debt
gh issue create \
  --title "Tech Debt: [description]" \
  --body "..." \
  --label "technical-debt"

# Documentation
gh issue create \
  --title "Docs: [description]" \
  --body "..." \
  --label "documentation"
```

## Organizing Issues into Epics

### What is an Epic?

An epic is a large body of work that can be broken down into smaller issues. Epics help organize related work and provide high-level visibility into feature development.

### Creating Epics

Epics are typically:
- Large features or initiatives
- Collections of related user stories
- Work that spans multiple sprints/iterations
- Features with multiple acceptance criteria

### Epic Structure

```markdown
## Epic: [Epic Name]

### Goal
[High-level goal or objective]

### User Value
[Why this epic matters to users]

### Success Metrics
- [Measurable metric 1]
- [Measurable metric 2]

### Related Issues
- #[issue-1] - [Sub-feature 1]
- #[issue-2] - [Sub-feature 2]
- #[issue-3] - [Sub-feature 3]

### Dependencies
- Blocks: #[other-epic]
- Blocked by: #[other-epic]

### Timeline
- Start: [date]
- Target completion: [date]
```

### Creating Epics with GitHub CLI

#### Method 1: Epic as a Project

```bash
# Create a project for the epic
gh project create \
  --title "Epic: User Authentication" \
  --body "Complete user authentication system with session-based auth, password reset, and session management"

# Add issues to the project
gh project item-add [project-number] --owner [owner] --repo [repo] --url [issue-url]
```

#### Method 2: Epic as a Label

```bash
# Create epic label
gh label create "epic:user-auth" --description "User Authentication Epic" --color "0E8A16"

# Create epic issue
EPIC_BODY="## Epic: User Authentication

### Goal
Implement complete user authentication system

### User Value
Users can securely authenticate and access protected resources

### Success Metrics
- 100% of protected routes require authentication
- Zero security vulnerabilities
- <2s authentication response time

### Related Issues
- #101 - Session management
- #102 - Password hashing
- #103 - Login endpoint
- #104 - Protected route session validation
- #105 - Password reset flow

### Timeline
- Start: 2024-01-15
- Target completion: 2024-02-15"

gh issue create \
  --title "Epic: User Authentication" \
  --body "$EPIC_BODY" \
  --label "epic:user-auth"

# Link child issues to epic
gh issue edit 101 --add-label "epic:user-auth"
gh issue edit 102 --add-label "epic:user-auth"
gh issue edit 103 --add-label "epic:user-auth"
```

#### Method 3: Epic Using Issue References

```bash
# Create epic issue
EPIC_BODY="## Epic: Task Management API

### Goal
Build complete tRPC API for task management

### Related Issues
- #201 - Task CRUD operations
- #202 - Task filtering
- #203 - Task search
- #204 - Task assignment
- #205 - Task notifications"

gh issue create \
  --title "Epic: Task Management API" \
  --body "$EPIC_BODY" \
  --label "epic"

# Reference epic in child issues
gh issue comment 201 --body "Part of Epic: Task Management API (#[epic-issue-number])"
```

### Managing Epic Issues

```bash
# List all epic issues
gh issue list --label "epic"

# View epic details
gh issue view [epic-issue-number]

# List issues in an epic (by label)
gh issue list --label "epic:user-auth"

# Update epic status
gh issue edit [epic-issue-number] --add-label "in-progress"

# Close epic (closes all linked issues)
gh issue close [epic-issue-number]
```

## Using GitHub Projects for Epic Organization

### Creating a Project

```bash
# Create project
gh project create \
  --title "Q1 2024 Features" \
  --body "Major features planned for Q1 2024"

# View project
gh project view [project-number]

# Add issues to project
gh project item-add [project-number] --owner [owner] --repo [repo] --url [issue-url]
```

### Project Views

GitHub Projects support multiple views:

- **Kanban**: Track work through stages
- **Cycle**: View work by iteration/sprint
- **Waterfall**: Sequential project phases

```bash
# List project items
gh project item-list [project-number]

# Move item between columns (Kanban)
gh project item-edit [item-id] --field-id [field-id] --project-id [project-id] --single-select-option-id [option-id]
```

## Best Practices for Issue Creation

### 1. Be Specific

❌ Bad: "Fix the bug"
✅ Good: "Bug: Login fails when email contains special characters"

### 2. Include Edge Cases

Always list edge cases that need handling:
- Empty inputs
- Invalid inputs
- Boundary conditions
- Error scenarios
- Security considerations

### 3. Provide Technical Guidance

Specify:
- Files that need modification
- How files should be modified
- Implementation approach
- Architecture considerations

### 4. Emphasize Testing

Always include:
- Test coverage requirements (>80%)
- Types of tests needed (unit, integration, E2E)
- Specific test scenarios
- Edge case testing

### 5. Link Related Issues

```bash
# Link issues
gh issue comment [issue-number] --body "Related to #123, blocks #124"

# Use issue references in body
gh issue edit [issue-number] --body "Depends on #123 and #124"
```

### 6. Use Labels Effectively

```bash
# Create custom labels
gh label create "priority:high" --color "d73a4a"
gh label create "area:api" --color "0075ca"
gh label create "size:large" --color "7057ff"

# Apply labels
gh issue edit [issue-number] --add-label "priority:high,area:api"
```

### 7. Update Issues Regularly

```bash
# Add comment to issue
gh issue comment [issue-number] --body "Updated: Implementation complete, ready for review"

# Update issue status
gh issue edit [issue-number] --add-label "in-progress"
gh issue edit [issue-number] --remove-label "todo"

# Close issue
gh issue close [issue-number] --comment "Completed in PR #456"
```

## Example: Complete Epic Creation

```bash
#!/bin/bash

# Create epic
EPIC_NUMBER=$(gh issue create \
  --title "Epic: Task Management System" \
  --body "## Epic: Task Management System

### Goal
Build a complete task management system with CRUD operations, filtering, search, and user assignment.

### User Value
Users can efficiently manage tasks, filter by status/priority, search tasks, and assign tasks to team members.

### Success Metrics
- All CRUD operations functional
- Filter performance <100ms
- Search performance <200ms
- 100% test coverage for core features

### Related Issues
- #301 - Task CRUD operations
- #302 - Task filtering
- #303 - Task search
- #304 - Task assignment

### Timeline
- Start: 2024-01-20
- Target completion: 2024-03-01" \
  --label "epic" \
  --json number --jq .number)

echo "Created epic: #$EPIC_NUMBER"

# Create child issues
gh issue create \
  --title "Feature: Task CRUD operations" \
  --body "## Problem Statement
Users need basic CRUD operations to manage tasks.

## User Story
As a user, I want to create, read, update, and delete tasks so that I can manage my task list.

## Acceptance Criteria
- [ ] `task.create` procedure creates a new task
- [ ] `task.list` procedure returns list of tasks
- [ ] `task.get` procedure returns single task by ID
- [ ] `task.update` procedure updates a task
- [ ] `task.delete` procedure deletes a task

## Edge Cases
- Creating task with empty title: Return 400 error
- Updating non-existent task: Return 404 error
- Deleting non-existent task: Return 404 error
- Invalid task data: Return 400 with validation errors
- Concurrent updates: Handle with optimistic locking

## Technical Guidance

### Files to Modify
- \`src/server/api/trpc/task.ts\` - Add CRUD procedures (create, list, get, update, delete)
- \`prisma/schema.prisma\` - Add Task model
- \`prisma/seed.ts\` - Add task seed data with good test data
- \`tests/task.test.ts\` - Add comprehensive CRUD tests
- \`docs/api.md\` - Update API documentation

### Implementation Approach
1. Create Task model in Prisma schema
2. Run Prisma migrations
3. Implement tRPC procedures for each CRUD operation with Zod validation
4. Add task seed data to seeders
5. Write comprehensive tests using tRPC testing utilities
6. Update API documentation

## Best Practices
- [ ] Add unit tests (target coverage: >80%)
- [ ] Add integration tests for all endpoints
- [ ] Follow RESTful API conventions
- [ ] Update API documentation
- [ ] Ensure type checking passes
- [ ] Ensure formatting and linting pass
- [ ] Add proper error handling
- [ ] Consider pagination for list endpoints" \
  --label "enhancement,epic:task-management" \
  --body "Part of Epic #$EPIC_NUMBER"

# Link to epic
gh issue comment 301 --body "Part of Epic: Task Management System #$EPIC_NUMBER"
```

## Issue Lifecycle Management

```bash
# View issue status
gh issue view [issue-number] --json state,labels

# Transition issue states
gh issue edit [issue-number] --add-label "in-progress" --remove-label "todo"
gh issue edit [issue-number] --add-label "review" --remove-label "in-progress"
gh issue edit [issue-number] --add-label "done" --remove-label "review"

# Close issue with reference to PR
gh issue close [issue-number] --comment "Completed in PR #789"
```

## Summary

Good issues include:
- ✅ Clear problem statement and user story
- ✅ Specific acceptance criteria
- ✅ Edge cases documented
- ✅ Technical guidance (files to modify, approach)
- ✅ Best practices (testing, code quality)
- ✅ Dependencies and relationships

Good epics:
- ✅ High-level goal and user value
- ✅ Success metrics
- ✅ Related issues linked
- ✅ Timeline and dependencies
- ✅ Organized in GitHub Projects

Use GitHub CLI (`gh`) to:
- Create issues with rich content
- Organize issues into epics
- Manage issue lifecycle
- Link related issues
- Track progress in Projects
