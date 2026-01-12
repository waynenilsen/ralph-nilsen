# Installation Guide

## Prerequisites

- [Bun](https://bun.sh/) (latest stable version)
- [Docker](https://www.docker.com/) and Docker Compose
- PostgreSQL 15+ (via Docker)

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Start PostgreSQL

```bash
bun run docker:up
```

This starts:
- PostgreSQL on port 40001
- MailHog SMTP server on port 40025 (for email testing)
- MailHog web UI on port 40080 (view captured emails)

### 3. Run Database Migrations

```bash
bun run db:migrate
```

### 4. Seed Demo Data (Optional)

```bash
bun run db:seed
```

This creates a demo tenant with an API key for testing.

### 5. Start Development Server

```bash
bun run dev
```

The application will be available at http://localhost:40000.

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Application
PORT=40000
NEXT_PUBLIC_APP_URL=http://localhost:40000

# Database (app_user for RLS-enforced queries, todo_user for migrations)
DATABASE_URL=postgresql://app_user:app_pass@localhost:40001/todo_db
DATABASE_URL_ADMIN=postgresql://todo_user:todo_pass@localhost:40001/todo_db

# Authentication
ADMIN_API_KEY=admin-secret-key-change-in-production
BCRYPT_ROUNDS=12
```

**Note**: The application uses two database connections:
- `DATABASE_URL`: Uses `app_user` (non-superuser) for RLS enforcement
- `DATABASE_URL_ADMIN`: Uses `todo_user` (superuser) for migrations and API key validation

## Port Configuration

All ports must be in the 40000-50000 range:

- **Next.js**: 40000
- **PostgreSQL**: 40001
- **MailHog SMTP**: 40025
- **MailHog Web UI**: 40080

## Docker Commands

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

## Database Management

```bash
# Run migrations
bun run db:migrate

# Seed demo data
bun run db:seed

# Reset database
bun run db:reset
```

## Troubleshooting

### Port already in use

```bash
lsof -ti:40000 | xargs kill -9
lsof -ti:40001 | xargs kill -9
```

### Database connection failed

1. Ensure Docker is running: `docker ps`
2. Check PostgreSQL container: `docker-compose ps`
3. Verify DATABASE_URL in .env.local

## Testing

### Unit Tests

```bash
bun run test
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time)
bunx playwright install

# Run E2E tests
bun run test:e2e

# Run E2E tests with UI
bun run test:e2e:ui
```

## Email Testing

Emails sent by the application are captured by MailHog in development:

1. Open http://localhost:40080 in your browser
2. All emails (signup confirmation, password reset) appear here
3. Emails are not actually sent - they're captured for testing
