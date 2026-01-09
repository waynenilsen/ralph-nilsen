# Conventional Commits Guide

## Overview

Conventional Commits is a specification that standardizes commit message formats. This specification enhances both human readability and machine processing, enabling automated changelog generation, semantic versioning, and better codebase organization.

**Reference**: [conventionalcommits.org](https://www.conventionalcommits.org/)

## Commit Message Structure

A Conventional Commit message follows this structure:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Components

- **`<type>`**: Required. Specifies the nature of the change.
- **`[optional scope]`**: Optional. Provides context about the area of the codebase affected.
- **`<description>`**: Required. A concise summary of the change (imperative mood).
- **`[optional body]`**: Optional. Detailed explanation of the change.
- **`[optional footer(s)]`**: Optional. Additional information (breaking changes, issue references).

## Commit Types

### Standard Types

- **`feat`**: Introduces a new feature
- **`fix`**: Addresses a bug fix
- **`docs`**: Modifies documentation only
- **`style`**: Code style changes (formatting, semicolons, etc.) that don't affect functionality
- **`refactor`**: Code changes that neither fix a bug nor add a feature
- **`perf`**: Performance improvements
- **`test`**: Adds or modifies tests
- **`build`**: Changes to build system or external dependencies
- **`ci`**: Changes to CI configuration files and scripts
- **`chore`**: Routine tasks or maintenance (updating dependencies, etc.)
- **`revert`**: Reverts a previous commit

### Breaking Changes

Use `!` after the type/scope to indicate a breaking change:

```
feat!: remove deprecated API endpoint
feat(api)!: change authentication method
```

Or use `BREAKING CHANGE:` in the footer:

```
feat: add new API

BREAKING CHANGE: The old API endpoint is removed
```

## Scope

The scope is optional and provides context about what part of the codebase is affected:

```
feat(auth): add session refresh
fix(api): handle null response
docs(readme): update installation instructions
refactor(models): simplify user model
```

Common scopes:
- Component names: `auth`, `api`, `ui`, `models`
- File areas: `routes`, `middleware`, `utils`
- Features: `user-auth`, `task-management`

## Description

The description should:
- Be in **imperative mood** ("add" not "added" or "adds")
- Be concise (50 characters or less)
- Not end with a period
- Describe **what** the commit does, not why

✅ Good:
- `feat: add user authentication`
- `fix: handle null pointer exception`
- `docs: update API documentation`

❌ Bad:
- `feat: added user authentication` (past tense)
- `fix: fixes bug` (vague)
- `docs: Updated API docs.` (period, past tense)

## Body

The body provides detailed explanation:
- Explains **why** the change was made
- Explains **how** it differs from previous behavior
- Can include multiple paragraphs
- Separate from description with blank line

```
feat: add task filtering

Add ability to filter tasks by status and priority. This allows
users to focus on specific subsets of their tasks.

The filtering is implemented at the database level for
performance, with validation at the API layer.
```

## Footer

Footers provide additional metadata:

### Breaking Changes

```
feat: change authentication method

BREAKING CHANGE: Sessions now expire after 1 hour instead of 24 hours.
Users will need to re-authenticate more frequently.
```

### Issue References

```
fix: resolve login timeout issue

Closes #123
Fixes #456
Refs #789
```

### Co-authors

```
feat: add new feature

Co-authored-by: John Doe <john@example.com>
Co-authored-by: Jane Smith <jane@example.com>
```

## Examples

### Simple Feature

```
feat: add user registration endpoint
```

### Feature with Scope

```
feat(auth): add password reset functionality
```

### Feature with Body

```
feat(api): add task filtering

Add ability to filter tasks by status, priority, and assignee.
Implements pagination for large result sets.

Closes #123
```

### Bug Fix

```
fix: handle null pointer in task creation

When task title is null, return 400 error instead of crashing.
Adds validation middleware to prevent null titles.

Fixes #456
```

### Breaking Change

```
feat!: remove deprecated API endpoints

BREAKING CHANGE: The /api/v1/tasks endpoint is removed.
Use /api/v2/tasks instead.
```

### Documentation

```
docs: update API usage examples

Add examples for all CRUD operations and error handling.
```

### Refactoring

```
refactor(models): simplify task model

Extract validation logic into separate middleware.
Improves testability and separation of concerns.
```

### Test

```
test: add integration tests for task API

Add comprehensive tests for all CRUD operations,
including edge cases and error scenarios.

Covers #123
```

### Style

```
style: format code with prettier

Run prettier on all files to ensure consistent formatting.
```

### Chore

```
chore: update dependencies

Update bun and fix security vulnerabilities.
```

## Best Practices

### 1. Use Imperative Mood

✅ `feat: add user authentication`
❌ `feat: added user authentication`
❌ `feat: adds user authentication`

### 2. Keep Description Concise

✅ `fix: handle null pointer exception`
❌ `fix: handle null pointer exception that occurs when user data is missing`

### 3. Use Body for Details

If you need to explain more, use the body:

```
fix: handle null pointer

When user data is missing from the database, return 404
instead of crashing. This prevents server errors when
invalid user IDs are provided.
```

### 4. Reference Issues

Always reference related issues:

```
feat: add task filtering

Closes #123
Related to #456
```

### 5. Use Scopes Consistently

Define and use consistent scopes across the project:

```
feat(auth): add session refresh
fix(auth): handle expired sessions
refactor(auth): simplify session validation
```

### 6. Group Related Changes

Make separate commits for unrelated changes:

❌ Bad:
```
fix: handle null pointer and add new feature
```

✅ Good:
```
fix: handle null pointer in user model
feat: add task assignment feature
```

### 7. Use Breaking Change Notation

Always mark breaking changes:

```
feat!: change API response format

BREAKING CHANGE: Task objects now include 'metadata' field
instead of separate 'created' and 'updated' fields.
```

## GitHub Integration

### Commit via Git

```bash
# Simple commit
git commit -m "feat: add user authentication"

# Commit with body
git commit -m "feat: add user authentication" -m "Implements session-based authentication with email/password"

# Commit with issue reference
git commit -m "feat: add task filtering" -m "Closes #123"
```

### Commit via GitHub CLI

```bash
# Create commit via gh (if using gh for git operations)
gh pr create --title "feat: add user authentication" \
  --body "Implements session-based authentication with email/password

Closes #123"
```

### PR Titles

PR titles should also follow conventional commits:

```bash
gh pr create --title "feat: add user authentication" \
  --body "Implements session-based authentication with email/password.

Closes #123"
```

## Automated Tools

### Commitlint

Validate commit messages:

```bash
# Install commitlint
bun add -d @commitlint/config-conventional @commitlint/cli

# Configure .commitlintrc.json
{
  "extends": ["@commitlint/config-conventional"]
}
```

### Husky

Enforce conventional commits with git hooks:

```bash
# Install husky
bun add -d husky

# Setup commit-msg hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

### Semantic Versioning

Conventional commits enable semantic versioning:

- `feat:` → Minor version bump
- `fix:` → Patch version bump
- `BREAKING CHANGE:` → Major version bump

## Common Patterns

### Feature Development

```
feat: add initial feature
feat: enhance feature with new capability
fix: fix bug in feature
test: add tests for feature
docs: document feature usage
```

### Bug Fixes

```
fix: resolve immediate issue
test: add regression test
docs: update troubleshooting guide
```

### Refactoring

```
refactor: improve code structure
test: update tests for refactored code
style: format refactored code
```

## Summary

**Key Rules:**
1. Use conventional commit format: `<type>[scope]: <description>`
2. Use imperative mood for descriptions
3. Keep descriptions concise (<50 chars)
4. Use body for detailed explanations
5. Reference issues in footer
6. Mark breaking changes with `!` or `BREAKING CHANGE:`
7. Use consistent scopes
8. Make separate commits for unrelated changes

**Benefits:**
- Automated changelog generation
- Semantic versioning alignment
- Better codebase organization
- Improved collaboration
- Machine-readable commit history
