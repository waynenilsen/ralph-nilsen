# Conventional Commits Specification

This document outlines the commit message conventions used in this project. Following these standards ensures a clear, consistent commit history and enables automated tooling for versioning and changelog generation.

## Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Structure

- **Type** (required): The type of change being made
- **Scope** (optional): The area of the codebase affected
- **Description** (required): A concise summary of the change
- **Body** (optional): Additional context about the change
- **Footer** (optional): Metadata such as breaking changes or issue references

## Commit Types

### Primary Types

- **`feat`**: A new feature
  - Example: `feat(auth): add API key authentication`
  - Example: `feat(todos): add filtering by priority`

- **`fix`**: A bug fix
  - Example: `fix(api): handle null tenant_id in middleware`
  - Example: `fix(db): resolve RLS policy for todo_tags`

- **`docs`**: Documentation only changes
  - Example: `docs: update API endpoint documentation`
  - Example: `docs(dev-flow): add testing guidelines`

- **`style`**: Code style changes that don't affect functionality
  - Formatting, missing semicolons, whitespace, etc.
  - Example: `style: format code with prettier`
  - Example: `style(components): fix indentation`

- **`refactor`**: Code refactoring without changing functionality
  - Example: `refactor(db): extract tenant context helper`
  - Example: `refactor(api): simplify error handling`

- **`test`**: Adding or modifying tests
  - Example: `test(todos): add integration tests for CRUD operations`
  - Example: `test(auth): add unit tests for API key validation`

- **`chore`**: Maintenance tasks, dependency updates, build config
  - Example: `chore: update dependencies`
  - Example: `chore(docker): update postgres image version`

### Special Types

- **`perf`**: Performance improvements
  - Example: `perf(db): add index on tenant_id and status`

- **`ci`**: CI/CD configuration changes
  - Example: `ci: add GitHub Actions workflow`

- **`build`**: Build system or dependency changes
  - Example: `build: update Next.js to version 14`

- **`revert`**: Reverting a previous commit
  - Example: `revert: revert "feat(auth): add OAuth support"`

## Scope

The scope is optional and indicates the area of the codebase affected. Use lowercase and be specific:

- `auth` - Authentication related
- `api` - API endpoints
- `db` - Database operations
- `todos` - Todo feature
- `tags` - Tags feature
- `tenants` - Tenant management
- `ui` - User interface components
- `middleware` - Middleware functions
- `rls` - Row-level security policies
- `docs` - Documentation
- `test` - Tests

## Description

- Use imperative, present tense: "add feature" not "added feature" or "adds feature"
- Don't capitalize the first letter
- No period (.) at the end
- Keep it concise (50-72 characters recommended)
- Be specific about what changed

### Good Examples

- `feat(todos): add priority filtering`
- `fix(auth): validate API key before setting tenant context`
- `docs(api): document pagination parameters`

### Bad Examples

- `feat: stuff` (too vague)
- `Fixed bug` (wrong tense, no type)
- `feat(todos): Add priority filtering.` (capitalized, has period)
- `feat: added new feature for todos with priority filtering and search` (too long)

## Body

The body is optional and provides additional context:

- Explain **what** and **why** vs. **how**
- Wrap at 72 characters
- Use blank line to separate from description
- Can include multiple paragraphs

### Example

```
feat(todos): add priority filtering

Add ability to filter todos by priority level (low, medium, high).
This improves user experience by allowing quick access to
high-priority items.

The filter is applied at the database level for optimal performance.
```

## Footer

The footer is optional and used for:

- **Breaking changes**: Start with `BREAKING CHANGE:` or `!` after type/scope
- **Issue references**: `Closes #123`, `Fixes #456`
- **Co-authors**: `Co-authored-by: Name <email>`

### Breaking Changes

If a commit introduces breaking changes, indicate this:

```
feat(api)!: change response format

BREAKING CHANGE: Todo response now includes nested tags array
instead of separate tag_ids field. Update client code accordingly.
```

Or use `!` in the type:

```
feat(api)!: change response format
```

### Issue References

```
fix(auth): resolve tenant context leak

Fixes #42
Closes #38
```

## Examples

### Simple Feature

```
feat(todos): add due date field
```

### Feature with Scope and Body

```
feat(db): add RLS policy for todos table

Implement row-level security policy to ensure tenants can only
access their own todos. Uses current_tenant_id() function to
enforce isolation at the database level.
```

### Bug Fix with Issue Reference

```
fix(api): prevent cross-tenant data access

Validate tenant_id from API key matches requested resource tenant_id
before processing request. This prevents potential security issues
where a tenant could access another tenant's data.

Fixes #15
```

### Breaking Change

```
feat(api)!: change pagination response format

BREAKING CHANGE: Pagination response now uses 'data' and 'meta' keys
instead of flat structure. Update client code to access items via
response.data instead of response.items.

Migration guide available in docs/api/pagination.md
```

### Refactoring

```
refactor(db): extract tenant context helper

Create reusable withTenantContext() function to eliminate duplication
in database query functions. This ensures consistent tenant context
handling across all database operations.
```

### Documentation

```
docs: add database schema documentation

Document all tables, relationships, and RLS policies in
docs/database/schema.md. Include examples and migration notes.
```

### Test

```
test(todos): add integration tests for filtering

Add comprehensive integration tests covering:
- Filter by status
- Filter by priority
- Filter by tags
- Combined filters
- Pagination with filters

Achieves 100% coverage for todo filtering functionality.
```

## Best Practices

### 1. Atomic Commits

Each commit should represent a single logical change:

- ✅ Good: One feature, one commit
- ❌ Bad: Multiple unrelated changes in one commit

### 2. Commit Frequently

Commit as you go, not at the end of the day:

- Commit when a logical unit of work is complete
- Makes it easier to track progress
- Easier to revert if needed
- Better for code review

### 3. Write Clear Messages

- Be specific about what changed
- Explain why if it's not obvious
- Reference related issues
- Use present tense

### 4. Use Scopes Appropriately

- Use scopes for clarity when the type alone isn't specific enough
- Don't use scopes if the change affects multiple areas
- Keep scope names consistent

### 5. Breaking Changes

- Always document breaking changes
- Use `BREAKING CHANGE:` footer or `!` in type
- Provide migration guidance when possible

### 6. Test Commits

- Include test changes with feature commits when possible
- Or commit tests separately with `test:` type
- Ensure tests pass before committing

## Commit Message Template

Use this template when writing commit messages:

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Tools and Automation

Conventional commits enable:

- **Automatic versioning**: Based on commit types (feat = minor, fix = patch)
- **Changelog generation**: Automated from commit history
- **Release notes**: Extract from commits
- **Git hooks**: Validate commit message format

## References

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [Commitizen](https://github.com/commitizen/cz-cli) - Tool for writing conventional commits

---

**Remember**: Good commit messages help future you (and your team) understand why changes were made. Take the time to write clear, descriptive messages.
