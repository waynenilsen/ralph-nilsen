# Development Flow & Stack

## Tech Stack

### Core Technologies
- **Runtime**: Bun (latest stable)
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **API Layer**: tRPC
- **Data Fetching**: TanStack Query (React Query)
- **Database**: PostgreSQL 15+
- **Containerization**: Docker Compose

### Development Tools
- **Testing**: Bun test (built-in test runner)
- **Type Safety**: TypeScript (strict mode)
- **Code Quality**: ESLint, Prettier
- **Database Migrations**: Custom migration scripts or Drizzle ORM

## Port Configuration

**Critical**: All ports must be between 40000-50000 to avoid collisions.

### Port Assignments
- **Next.js Dev Server**: `40000`
- **PostgreSQL**: `40001`
- **PostgreSQL Admin** (pgAdmin, optional): `40002`
- **Reserved for future services**: `40003-49999`

### Environment Variables
```env
# Application
PORT=40000
NEXT_PUBLIC_APP_URL=http://localhost:40000

# Database
DATABASE_URL=postgresql://todo_user:todo_pass@localhost:40001/todo_db
POSTGRES_PORT=40001
POSTGRES_USER=todo_user
POSTGRES_PASSWORD=todo_pass
POSTGRES_DB=todo_db

# Node Environment
NODE_ENV=development
```

## Project Structure

```
ralph-nilsen/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (api)/             # API routes (if needed)
│   │   ├── (auth)/            # Auth pages
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── server/                # Server-side code
│   │   ├── db/                # Database connection & queries
│   │   │   ├── index.ts       # Connection pool
│   │   │   ├── migrations/    # Migration files
│   │   │   └── schema.sql     # Schema definitions
│   │   ├── trpc/              # tRPC setup
│   │   │   ├── router.ts      # Main router
│   │   │   ├── context.ts     # tRPC context
│   │   │   ├── middleware.ts  # Auth, tenant context middleware
│   │   │   └── routers/       # Feature routers
│   │   │       ├── todos.ts
│   │   │       ├── tags.ts
│   │   │       └── tenants.ts
│   │   └── lib/               # Server utilities
│   │       ├── auth.ts        # Authentication logic
│   │       ├── tenant.ts      # Tenant context helpers
│   │       └── errors.ts      # Error handling
│   ├── client/                # Client-side code
│   │   ├── components/        # React components
│   │   │   ├── ui/            # Reusable UI components
│   │   │   └── features/      # Feature components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Client utilities
│   │   │   └── trpc.ts        # tRPC client setup
│   │   └── styles/            # Global styles
│   └── shared/                # Shared types/utilities
│       ├── types/             # TypeScript types
│       ├── constants/         # Constants
│       └── utils/             # Shared utilities
├── tests/                      # Test files
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── helpers/                # Test utilities
├── docker-compose.yml          # Docker Compose config
├── Dockerfile                  # Application Dockerfile (if needed)
├── bun.lockb                   # Bun lockfile
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── .env.example
```

## Docker Compose Setup

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: todo-postgres
    environment:
      POSTGRES_USER: todo_user
      POSTGRES_PASSWORD: todo_pass
      POSTGRES_DB: todo_db
    ports:
      - "40001:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/server/db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todo_user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - todo-network

volumes:
  postgres_data:

networks:
  todo-network:
    driver: bridge
```

### Docker Commands

```bash
# Start PostgreSQL
bun run docker:up

# Stop PostgreSQL
bun run docker:down

# View logs
bun run docker:logs

# Reset database (WARNING: deletes all data)
bun run docker:reset
```

## Development Workflow

### Initial Setup

1. **Install Bun** (if not already installed)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Start PostgreSQL**
   ```bash
   bun run docker:up
   ```

4. **Run Migrations**
   ```bash
   bun run db:migrate
   ```

5. **Start Dev Server**
   ```bash
   bun run dev
   ```

### Daily Development

1. **Ensure you're on a feature branch**
   ```bash
   git branch  # Check current branch
   # If on main, create a feature branch:
   git checkout -b feature/your-feature-name
   ```

2. **Pull latest changes** (if working on existing branch)
   ```bash
   git pull origin main  # Update main
   git rebase main       # Rebase your feature branch on latest main
   ```

3. **Start services**
   ```bash
   bun run docker:up
   bun run dev
   ```

4. **Run tests in watch mode**
   ```bash
   bun test --watch
   ```

5. **Commit as you go**
   - Make a logical change
   - Test it works
   - Commit with conventional commit message
   - Repeat

6. **Before committing** (run these checks)
   ```bash
   bun run test        # Run all tests
   bun run lint        # Lint code
   bun run type-check  # TypeScript check
   ```

7. **Push commits frequently**
   ```bash
   git push origin feature/your-feature-name
   ```

## Testing Strategy

### Testing Philosophy

- **Target**: 100% test coverage
- **Approach**: Test-driven development (TDD) when possible
- **Focus**: Test behavior, not implementation details
- **Refactor**: Continuously refactor to eliminate duplication

### Test Structure

```typescript
// tests/unit/server/db/todos.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTodo, getTodosByTenant } from "@/server/db/todos";

describe("Todo Database Operations", () => {
  beforeEach(async () => {
    // Setup test database state
  });

  afterEach(async () => {
    // Cleanup test data
  });

  it("should create a todo for a tenant", async () => {
    // Test implementation
  });

  it("should only return todos for the specified tenant", async () => {
    // Test tenant isolation
  });
});
```

### Test Categories

1. **Unit Tests** (`tests/unit/`)
   - Test individual functions/modules in isolation
   - Mock external dependencies
   - Fast execution

2. **Integration Tests** (`tests/integration/`)
   - Test database operations with real PostgreSQL
   - Test tRPC routers end-to-end
   - Test RLS policies

3. **API Tests** (`tests/api/`)
   - Test HTTP endpoints
   - Test authentication/authorization
   - Test tenant isolation

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/unit/server/db/todos.test.ts

# Run with coverage
bun test --coverage

# Run integration tests only
bun test tests/integration/
```

### Test Coverage Goals

- **Minimum**: 90% coverage
- **Target**: 100% coverage
- **Critical paths**: Must be 100% covered
  - Authentication
  - Tenant isolation
  - RLS policies
  - Data validation

## Code Quality Practices

### DRY (Don't Repeat Yourself)

**Principles:**
- Extract common logic into reusable functions
- Create shared utilities for repeated patterns
- Use TypeScript types/interfaces for shared structures
- Refactor immediately when duplication is detected

**Examples:**

```typescript
// ❌ BAD: Duplication
const getTodosForTenant1 = async (tenantId: string) => {
  await db.query("SET app.current_tenant_id = $1", [tenantId]);
  return db.query("SELECT * FROM todos");
};

const getTagsForTenant1 = async (tenantId: string) => {
  await db.query("SET app.current_tenant_id = $1", [tenantId]);
  return db.query("SELECT * FROM tags");
};

// ✅ GOOD: DRY
async function withTenantContext<T>(
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  await db.query("SET app.current_tenant_id = $1", [tenantId]);
  try {
    return await callback();
  } finally {
    await db.query("RESET app.current_tenant_id");
  }
}

const getTodosForTenant = async (tenantId: string) => {
  return withTenantContext(tenantId, () => 
    db.query("SELECT * FROM todos")
  );
};
```

### Refactoring Guidelines

1. **Refactor as you go**: Don't accumulate technical debt
2. **Small, incremental changes**: Make refactoring part of regular development
3. **Test before refactoring**: Ensure tests pass before and after
4. **Identify patterns**: Look for repeated code blocks
5. **Extract abstractions**: Create reusable functions/components

### Code Review Checklist

- [ ] No code duplication
- [ ] All functions are testable
- [ ] Types are properly defined
- [ ] Error handling is comprehensive
- [ ] Tenant isolation is enforced
- [ ] Tests cover new functionality
- [ ] Code follows project conventions
- [ ] Documentation updated for new/changed features

## Documentation Practices

### Documentation Workflow

**CRITICAL**: Documentation is part of the development process, not an afterthought.

1. **Check Existing Docs First**
   - Before writing new documentation, check `./docs` folder
   - Review existing docs to see if updates are needed instead of creating duplicates
   - If `./docs` folder doesn't exist, create it

2. **Document As You Go**
   - Write documentation while developing features
   - Update docs immediately when APIs or schemas change
   - Don't defer documentation to "later"

3. **Documentation Structure** (`./docs/`)
   ```
   docs/
   ├── api/                    # API documentation
   │   ├── endpoints.md        # All API endpoints
   │   └── authentication.md  # Auth flow and API keys
   ├── database/               # Database documentation
   │   ├── schema.md          # Database schema overview
   │   ├── migrations/        # Migration notes
   │   └── rls-policies.md    # RLS policy documentation
   ├── architecture/          # Architecture decisions
   │   ├── multi-tenancy.md   # Multi-tenancy approach
   │   └── decisions.md       # ADRs (Architecture Decision Records)
   ├── setup/                 # Setup guides
   │   ├── installation.md   # Installation instructions
   │   └── development.md    # Development setup
   └── troubleshooting.md     # Common issues and solutions
   ```

4. **What to Document**
   - API endpoints (request/response examples)
   - Database schema changes
   - Architecture decisions and rationale
   - Setup and deployment procedures
   - Code examples and usage patterns
   - Troubleshooting steps
   - Configuration options

5. **Documentation Standards**
   - Use Markdown format (`.md` files)
   - Include code examples
   - Keep documentation up-to-date with code
   - Use clear, concise language
   - Add table of contents for long documents

### Documentation Checklist

When adding/changing features:
- [ ] Check `./docs` for existing related documentation
- [ ] Update or create API documentation
- [ ] Document database schema changes
- [ ] Add code examples if applicable
- [ ] Update setup/installation docs if needed
- [ ] Add troubleshooting notes for common issues

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev -p 40000",
    "build": "next build",
    "start": "next start -p 40000",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:migrate": "bun run src/server/db/migrate.ts",
    "db:seed": "bun run src/server/db/seed.ts",
    "db:reset": "bun run src/server/db/reset.ts",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f postgres",
    "docker:reset": "docker-compose down -v && docker-compose up -d",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

## Development Best Practices

### 1. Type Safety

- Use TypeScript strict mode
- Define types for all data structures
- Avoid `any` types
- Use type guards for runtime validation

### 2. Error Handling

- Use consistent error types
- Provide meaningful error messages
- Log errors appropriately
- Handle tenant context errors gracefully

### 3. Database Operations

- Always use parameterized queries
- Set tenant context before queries
- Use transactions for multi-step operations
- Clean up tenant context after operations

### 4. tRPC Routers

- Keep routers focused and single-purpose
- Use middleware for common concerns (auth, tenant context)
- Validate inputs with Zod schemas
- Return consistent response formats

### 5. Component Development

- Keep components small and focused
- Extract reusable UI components
- Use TanStack Query for data fetching
- Handle loading and error states

## Git Workflow

### Feature Branch Development

**CRITICAL**: All development work must be done on feature branches, not on `main` or `master`.

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/todo-priority-filtering
   # or
   git checkout -b fix/tenant-isolation-bug
   ```

2. **Work on Feature Branch**
   - All code changes happen on the feature branch
   - Keep the branch up-to-date with main: `git rebase main` or `git merge main`
   - Never commit directly to `main` branch

3. **Commit As You Go**
   - **Commit frequently**: Don't wait until the end of the day
   - Commit when a logical unit of work is complete
   - Each commit should represent a single, atomic change
   - Makes it easier to track progress, review, and revert if needed

4. **Commit Workflow**
   ```bash
   # Make changes
   # Stage changes
   git add .
   
   # Commit with conventional commit message
   git commit -m "feat(todos): add priority filtering"
   
   # Continue working, commit again when next logical unit is done
   git add .
   git commit -m "test(todos): add tests for priority filtering"
   ```

5. **Push Feature Branch**
   ```bash
   # Push branch to remote
   git push origin feature/todo-priority-filtering
   
   # Create pull request for code review
   ```

### Branch Naming

Use descriptive branch names following these patterns:

- `feature/` - New features
  - Example: `feature/todo-priority-filtering`
  - Example: `feature/api-key-authentication`
- `fix/` - Bug fixes
  - Example: `fix/tenant-isolation-bug`
  - Example: `fix/rls-policy-error`
- `refactor/` - Code refactoring
  - Example: `refactor/extract-tenant-context-helper`
- `test/` - Test improvements
  - Example: `test/add-integration-tests`
- `docs/` - Documentation
  - Example: `docs/update-api-documentation`

### Commit Messages

**Follow the [Conventional Commits specification](./conventional-commit.md)** for all commit messages.

Quick reference:
```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

Examples:
```
feat(todos): add priority filtering
fix(api): resolve tenant isolation bug in RLS
refactor(db): extract tenant context helper
test(todos): add integration tests for todos API
docs: update dev flow documentation
```

**See [conventional-commit.md](./conventional-commit.md) for complete guidelines, best practices, and examples.**

### Pre-commit Checklist

- [ ] All tests pass (`bun test`)
- [ ] TypeScript compiles (`bun run type-check`)
- [ ] Linter passes (`bun run lint`)
- [ ] Code is formatted (`bun run format`)
- [ ] No console.logs or debug code
- [ ] Test coverage meets threshold
- [ ] Documentation updated in `./docs` folder (if feature/API changed)

## Environment Setup

### Required Tools

- Bun (latest stable)
- Docker & Docker Compose
- Git
- VS Code (recommended) or preferred editor

### VS Code Extensions (Recommended)

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- tRPC

### Editor Configuration

**.vscode/settings.json**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Troubleshooting

### Common Issues

**Port already in use**
- Check if port 40000-40001 are available
- Kill process using port: `lsof -ti:40000 | xargs kill -9`

**Database connection failed**
- Ensure Docker Compose is running: `bun run docker:up`
- Check PostgreSQL health: `docker-compose ps`
- Verify DATABASE_URL in .env

**Tests failing**
- Ensure test database is set up
- Check test data cleanup
- Verify RLS policies are correct

**Type errors**
- Run `bun run type-check` to see all errors
- Ensure types are properly imported
- Check tRPC router types are exported

## Performance Considerations

- Use database connection pooling
- Implement proper indexing (see PRD)
- Use TanStack Query caching effectively
- Optimize database queries (avoid N+1)
- Monitor query performance

## Security Checklist

- [ ] All API endpoints validate tenant context
- [ ] RLS policies are enabled and tested
- [ ] API keys are properly hashed
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] No sensitive data in logs
- [ ] Environment variables not committed

---

**Last Updated**: 2024-01-15  
**Maintainer**: Development Team
