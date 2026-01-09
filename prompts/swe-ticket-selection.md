# Software Engineer Ticket Selection Guide

## Overview

This guide covers how Software Engineers should select tickets from the backlog for implementation. The key principle is that **tickets should be taken in their totality** - no specific ticket should take priority just because it's at the top of the backlog.

## Backlog Selection Principles

### 1. Take Tickets in Their Totality

**Important**: The backlog order does not indicate priority. You should:
- Evaluate tickets based on their completeness and readiness
- Consider dependencies and logical work order
- Select tickets that make sense together
- Avoid cherry-picking "easy" tickets

### 2. Evaluate Ticket Readiness

Before selecting a ticket, ensure it has:
- ✅ Clear problem statement
- ✅ User story and acceptance criteria
- ✅ Edge cases documented
- ✅ Technical guidance (files to modify)
- ✅ Best practices listed (including testing)
- ✅ Dependencies identified

### 3. Consider Logical Work Order

Select tickets that:
- Build on each other logically
- Minimize context switching
- Group related changes together
- Follow natural implementation flow

## Using GitHub CLI to Explore Backlog

### View Available Issues

```bash
# List all open issues
gh issue list --state open

# List issues by label
gh issue list --label "enhancement"
gh issue list --label "bug"
gh issue list --label "epic:user-auth"

# List issues in a project
gh project item-list [project-number]

# List issues assigned to you
gh issue list --assignee "@me"

# List unassigned issues
gh issue list --no-assignee
```

### Examine Issue Details

```bash
# View full issue details
gh issue view [issue-number]

# View issue with comments
gh issue view [issue-number] --comments

# View issues in an epic
gh issue list --label "epic:task-management"

# Check issue dependencies
gh issue view [issue-number] --json body | grep -i "depend\|block"
```

### Check Related Issues

```bash
# Find issues that block this one
gh issue list --search "blocks #[issue-number]"

# Find issues blocked by this one
gh issue list --search "blocked by #[issue-number]"

# View epic issues together
gh issue list --label "epic:[epic-name]"
```

## Ticket Selection Workflow

### Step 1: Review Backlog

```bash
# Get overview of available work
gh issue list --state open --limit 50

# Filter by area of interest
gh issue list --label "area:api"
gh issue list --label "area:frontend"

# Check for epics
gh issue list --label "epic"
```

### Step 2: Evaluate Ticket Quality

For each potential ticket, check:

```bash
# View ticket details
gh issue view [issue-number] --json body,labels,comments

# Verify it has:
# - Problem statement
# - User story
# - Acceptance criteria
# - Edge cases
# - Technical guidance
# - Best practices
```

### Step 3: Check Dependencies

```bash
# Check if ticket has dependencies
gh issue view [issue-number] | grep -i "depend\|block"

# Verify dependencies are complete
gh issue view [dependency-issue-number] --json state

# Check if ticket blocks others
gh issue list --search "blocked by #[issue-number]"
```

### Step 4: Select Logical Group

Select tickets that:
- Work well together
- Share common files/components
- Follow natural implementation sequence
- Can be completed in a cohesive PR

### Step 5: Assign and Start Work

```bash
# Assign issue to yourself
gh issue edit [issue-number] --add-assignee "@me"

# Update status
gh issue edit [issue-number] --add-label "in-progress" --remove-label "todo"

# Create branch for work
git checkout -b feature/[issue-number]-[short-description]

# Link branch to issue (in PR description)
gh pr create --title "Implement #[issue-number]: [description]" \
  --body "Closes #[issue-number]

Implements:
- [Feature 1]
- [Feature 2]

Related to: #[related-issue-1], #[related-issue-2]"
```

## What Makes a Good Ticket

### 1. Edge Cases Listed

A good ticket explicitly lists edge cases:

```markdown
## Edge Cases
- Empty input: Return 400 with clear error message
- Invalid format: Validate and return 400
- Non-existent resource: Return 404
- Concurrent modifications: Handle with optimistic locking
- SQL injection attempts: Sanitize inputs, return 400
- Very large datasets: Implement pagination (limit 100)
- Network failures: Retry with exponential backoff
- Authentication failures: Return 401 with clear message
```

**Why this matters**: 
- Prevents surprises during implementation
- Ensures comprehensive test coverage
- Reduces back-and-forth with product team

### 2. Specific Files to Modify

A good ticket specifies files and modifications:

```markdown
## Technical Guidance

### Files to Modify
- `src/routes/tasks.js` - Add POST /tasks route handler with validation
- `src/models/task.js` - Add createTask() method with input sanitization
- `src/middleware/validation.js` - Add taskSchema validation
- `tests/routes/tasks.test.js` - Add tests for POST /tasks (success, validation errors, edge cases)
- `tests/models/task.test.js` - Add tests for createTask() method
- `docs/api.md` - Update API documentation with new endpoint

### Implementation Approach
1. Add validation schema in validation.js
2. Implement createTask() in Task model
3. Add route handler in tasks.js
4. Write comprehensive tests
5. Update documentation
```

**Why this matters**:
- Reduces exploration time
- Ensures all related files are updated
- Helps estimate effort accurately
- Prevents missing related changes

### 3. Best Practices Always Listed

A good ticket always includes best practices:

```markdown
## Best Practices
- [ ] Add unit tests (target coverage: >80% for new code)
- [ ] Add integration tests for API endpoints
- [ ] Add E2E tests for critical user flows
- [ ] Follow existing code patterns and conventions
- [ ] Update documentation (API docs, README if needed)
- [ ] Ensure type checking passes (`bun run type-check`)
- [ ] Ensure formatting passes (`bun run format:check`)
- [ ] Ensure linting passes (`bun run lint`)
- [ ] Add error handling for all failure scenarios
- [ ] Consider performance implications (add indexes if needed)
- [ ] Add logging for debugging
- [ ] Follow security best practices (input sanitization, etc.)
```

**Why this matters**:
- Ensures consistent quality
- Prevents rework
- Sets clear expectations
- Reduces code review cycles

## Example: Selecting Tickets

### Scenario: Task Management Feature

```bash
# Step 1: Review available tickets
gh issue list --label "epic:task-management"

# Output:
# #301 - Task CRUD operations
# #302 - Task filtering
# #303 - Task search
# #304 - Task assignment

# Step 2: Evaluate each ticket
gh issue view 301  # Has edge cases, files, best practices ✓
gh issue view 302  # Depends on #301, has good details ✓
gh issue view 303  # Depends on #301, has good details ✓
gh issue view 304  # Depends on #301, has good details ✓

# Step 3: Logical selection
# Start with #301 (foundation), then #302, #303, #304
# OR: Group #301 + #302 together (CRUD + filtering are related)

# Step 4: Assign and start
gh issue edit 301 --add-assignee "@me" --add-label "in-progress"
gh issue edit 302 --add-assignee "@me" --add-label "in-progress"

# Step 5: Create branch
git checkout -b feature/task-crud-and-filtering
```

## Red Flags: When to Skip a Ticket

Avoid selecting tickets that:

❌ **Missing critical information**
- No edge cases listed
- No technical guidance
- No files specified
- Vague acceptance criteria

❌ **Dependencies not ready**
- Blocking issues not complete
- Required infrastructure missing
- API contracts not defined

❌ **Incomplete requirements**
- Unclear problem statement
- Missing user story
- No success criteria

**Action**: Comment on the issue requesting clarification before selecting it.

```bash
gh issue comment [issue-number] --body "This ticket needs:
- Edge cases documented
- Files to modify specified
- Best practices listed

Please update before I can start work."
```

## Working with Epics

### Selecting Epic Tickets

When working on an epic:

```bash
# View all tickets in epic
gh issue list --label "epic:user-auth"

# Understand epic structure
gh issue view [epic-issue-number]

# Select logical sequence
# Example: Authentication epic
# 1. User model (#101) - Foundation
# 2. Password hashing (#102) - Depends on #101
# 3. Login endpoint (#103) - Depends on #101, #102
# 4. Protected routes (#104) - Depends on #103
# 5. Password reset (#105) - Depends on #103

# Select in logical order, not backlog order
```

### Grouping Related Tickets

Group tickets that:
- Modify the same files
- Share common patterns
- Can be tested together
- Make sense as one PR

```bash
# Select related tickets
gh issue edit 301 --add-assignee "@me"
gh issue edit 302 --add-assignee "@me"

# Work on them together
git checkout -b feature/task-crud-and-filtering

# Single PR covering both
gh pr create --title "Implement task CRUD and filtering" \
  --body "Closes #301
Closes #302

Implements:
- Task CRUD operations
- Task filtering by status and priority"
```

## Best Practices Summary

### When Selecting Tickets

✅ **Do**:
- Evaluate ticket completeness
- Consider logical work order
- Group related tickets
- Check dependencies
- Verify technical guidance is clear
- Ensure edge cases are documented
- Confirm best practices are listed

❌ **Don't**:
- Select based solely on backlog position
- Cherry-pick "easy" tickets
- Ignore dependencies
- Start tickets missing critical info
- Work on tickets out of logical order

### Ticket Quality Checklist

Before selecting a ticket, verify:

- [ ] Problem statement is clear
- [ ] User story is defined
- [ ] Acceptance criteria are specific
- [ ] Edge cases are listed
- [ ] Files to modify are specified
- [ ] Implementation approach is outlined
- [ ] Best practices are listed (including testing)
- [ ] Dependencies are identified
- [ ] Related issues are linked

## Using GitHub Projects

### Kanban View

```bash
# View project items
gh project item-list [project-number]

# See what's in "To Do"
gh project item-list [project-number] --owner [owner] --limit 20

# Select from "To Do" based on quality, not position
```

### Cycle/Waterfall View

```bash
# View current cycle/sprint
gh project view [project-number]

# Select tickets for current iteration
# Still evaluate by quality, not position
```

## Summary

**Key Principle**: Tickets should be selected based on:
1. **Completeness** - Has all necessary information
2. **Readiness** - Dependencies are met
3. **Logical Order** - Makes sense in implementation sequence
4. **Quality** - Edge cases, files, best practices documented

**Not** based on:
- ❌ Backlog position
- ❌ Perceived difficulty
- ❌ Random selection

Always verify tickets have:
- ✅ Edge cases listed
- ✅ Specific files to modify
- ✅ Best practices (including test coverage)

Use `gh` CLI to explore, evaluate, and select tickets that make sense for your work.
