# Example: Ralph SDLC Loop with Multi-Agent System

This document demonstrates a complete Ralph SDLC loop using all agent personas working together on a real-world project.

## Task

```bash
/ralph-loop "Build a task management app with user authentication.
Requirements: Next.js monolith with tRPC API, email/password authentication, CRUD operations for tasks,
input validation, comprehensive tests (>80% coverage), API documentation,
README with setup instructions. Output <promise>COMPLETE</promise> when
all requirements met, all tests passing, and documentation complete." \
  --completion-promise "COMPLETE" \
  --max-iterations 50
```

## Iteration 1: Initial Development

### Phase 1: Ideation & Discovery

**Agent: Marketing & Market Research**

**Activities:**

- Researches task management market and user needs
- Analyzes competitive solutions (Todoist, Asana, Trello)
- Defines user personas
- Identifies key user pain points

**Output:**

```markdown
# Market Research Report

## User Personas

1. **Individual Professional** - Needs simple task tracking
2. **Team Manager** - Needs task assignment and collaboration
3. **Developer** - Needs API access for integrations

## Key Pain Points

- Overcomplicated interfaces
- Poor API access
- Lack of authentication/security
- No programmatic access

## Competitive Analysis

- Todoist: Strong API but complex
- Asana: Good collaboration, weak API
- Trello: Visual but limited programmatic access

## Market Opportunity

- Developers need simple, API-first task management
- Focus on programmatic access and authentication
```

**Completion:** ✅ Clear problem definition, user personas identified

---

### Phase 2: Requirements & Planning

**Agent: Product Developer**

**Activities:**

- Creates PRD based on market research
- Defines user stories
- Sets acceptance criteria
- Plans feature prioritization

**Output:**

```markdown
# Product Requirements Document

## Problem Statement

Users need a simple task management system with secure authentication and full CRUD operations.

## User Stories

### Must Have

1. **As a user**, I want to authenticate with email/password so that my account is secure
   - Acceptance: User can register with email/password
   - Acceptance: User can login with email/password
   - Acceptance: Protected routes require authentication
2. **As a user**, I want to create tasks so that I can track my work
   - Acceptance: User can create tasks via tRPC procedure
   - Acceptance: Task validation works correctly
   - Acceptance: Task is saved to database
3. **As a user**, I want to read my tasks so that I can see what I need to do
   - Acceptance: User can list all their tasks via tRPC procedure
   - Acceptance: User can get a single task by ID
4. **As a user**, I want to update tasks so that I can modify task details
   - Acceptance: User can update tasks via tRPC procedure
   - Acceptance: Returns updated task data
5. **As a user**, I want to delete tasks so that I can remove completed tasks
   - Acceptance: User can delete tasks via tRPC procedure
   - Acceptance: Task is removed from database

## Success Metrics

- All tRPC procedures functional
- Test coverage > 80%
- API documentation complete
- Authentication working
- Database seeded with good test data
- App runs locally with `bun dev` after fresh checkout
```

**Completion:** ✅ PRD complete, user stories defined, acceptance criteria clear

---

### Phase 3: Implementation

**Agent: Senior Software Engineer**

**Activities:**

- Designs architecture (Next.js, tRPC, Prisma, PostgreSQL)
- Generates random port number (50000-60000) for Postgres
- Sets up Docker Compose for PostgreSQL
- Sets up project structure with Next.js, Prisma, Tailwind, shadcn/ui
- Implements email/password authentication (home-rolled)
- Implements CRUD procedures via tRPC
- Creates database seeders with good test data
- Sets up .env.local with all required configs
- Writes unit tests
- Ensures types, formatting, and linting pass
- Creates GitHub Issues for work items
- Creates PR with passing CI

**GitHub Workflow:**

```bash
# Create feature branch
git checkout -b feature/task-api

# Implement code...

# Generate random port for Postgres (50000-60000)
POSTGRES_PORT=$(shuf -i 50000-60000 -n 1)
echo "DATABASE_URL=postgresql://user:password@localhost:${POSTGRES_PORT}/taskdb" >> .env.local

# Ensure types, formatting, linting pass locally
bun run type-check
bun run format:check
bun run lint

# Commit and push (using conventional commits)
git add .
git commit -m "feat(api): implement task CRUD operations with email/password auth" \
  -m "Implements tRPC procedures for task management with authentication.

  - Add task.create, task.list, task.get, task.update, task.delete procedures
  - Add email/password authentication (home-rolled)
  - Add input validation with Zod
  - Add database seeders with good test data
  - Add unit tests

  Closes #301"
git push origin feature/task-api

# Create PR (using conventional commits format for title)
gh pr create --title "feat(api): implement task CRUD operations with email/password auth" \
  --body "Implements tRPC procedures for task management with authentication.

- Add task.create, task.list, task.get, task.update, task.delete procedures
- Add email/password authentication (home-rolled)
- Add input validation with Zod
- Add database seeders with good test data
- Add unit tests

Closes #301"

# Check CI status
gh pr checks
```

**Output:**

```
project/
├── src/
│   ├── app/              # Next.js app directory
│   ├── server/
│   │   ├── api/
│   │   │   └── trpc/
│   │   │       ├── router.ts      # tRPC router
│   │   │       ├── auth.ts        # Auth procedures
│   │   │       └── task.ts        # Task procedures
│   │   └── db/
│   │       └── seed.ts            # Database seeder
│   ├── lib/
│   │   └── auth.ts       # Email/password auth helpers
│   └── components/       # shadcn/ui components
├── prisma/
│   ├── schema.prisma     # Prisma schema
│   └── seed.ts           # Prisma seed script
├── tests/
│   ├── auth.test.ts      # Auth tests
│   └── tasks.test.ts     # Task CRUD tests
├── docker-compose.yml    # PostgreSQL setup
├── .env.local            # All configs (checked in)
├── .github/
│   └── workflows/
│       └── ci.yml        # CI workflow (types, format, lint)
└── package.json
```

**Code Created:**

- Next.js app setup with App Router
- tRPC router and procedures setup
- Email/password authentication implementation (home-rolled)
- Prisma schema and migrations
- PostgreSQL database with Docker Compose
- Task CRUD procedures via tRPC
- Database seeders with good test data
- .env.local with all configs (including generated port)
- Basic validation with Zod
- Unit tests (some failing initially)
- GitHub Actions CI workflow
- GitHub PR created

**CI Status:**

```bash
$ gh pr checks
✓ type-check    passed
✓ format        passed
✓ lint          passed
```

**Completion:** ✅ Code structure in place, PR created, CI passing

---

### Phase 4: Testing & Validation

**Agent: QA Engineer**

**Activities:**

- Runs test suite
- Validates against acceptance criteria
- Tests edge cases
- Checks API endpoints manually
- Verifies CI checks are passing
- Creates GitHub Issues for bugs found

**GitHub Workflow:**

```bash
# Check CI status
gh pr checks

# Run tests locally
bun test

# Create bug issues
gh issue create --title "Bug: Task creation validation not working" \
  --body "Priority: High\n\nSteps to reproduce:..."
```

**Output:**

```markdown
# Test Results - Iteration 1

## Unit Tests

- ✅ Auth login test: PASS
- ✅ Auth token validation: PASS
- ❌ Task creation test: FAIL (validation error)
- ❌ Task update test: FAIL (404 error)
- ❌ Task deletion test: FAIL (auth middleware issue)

## Integration Tests

- ❌ POST /tasks without auth: Should return 401, returns 500
- ❌ GET /tasks with invalid token: Should return 401, returns 500

## Acceptance Criteria Validation

- ✅ User registration with email/password: PASS
- ✅ User login with email/password: PASS
- ❌ POST /tasks creates task: FAIL
- ❌ GET /tasks returns list: FAIL
- ❌ PUT /tasks/:id updates: FAIL
- ❌ DELETE /tasks/:id removes: FAIL

## Bugs Found

1. **HIGH**: Task creation validation not working (Issue #2)
2. **HIGH**: Auth middleware not applied to task routes (Issue #3)
3. **MEDIUM**: Error handling returns 500 instead of proper status codes (Issue #4)
4. **LOW**: Missing input sanitization (Issue #5)

## CI Status

✓ Type checking: PASS
✓ Formatting: PASS
✓ Linting: PASS
```

**Completion:** ✅ Tests executed, bugs identified, GitHub Issues created, CI passing

---

### Phase 5: Review & Analysis

**Agents: All (Collaborative)**

**Activities:**

- Review test results
- Analyze gaps
- Assess progress
- Plan fixes

**Output:**

```markdown
# Review & Analysis

## Progress Assessment

- ✅ Authentication: Working
- ❌ Task CRUD: Partially working, bugs found
- ❌ Error handling: Needs improvement
- ❌ Test coverage: ~40% (target: >80%)

## Gaps Identified

1. Auth middleware not applied to task routes
2. Input validation incomplete
3. Error handling needs improvement
4. Missing edge case tests
5. API documentation not started

## Next Steps

1. Fix auth middleware application
2. Complete input validation
3. Improve error handling
4. Add missing tests
5. Create API documentation
```

**Completion:** ✅ Review complete, gaps identified, plan created

---

### Phase 6: Refinement & Iteration

**Agents: All (Collaborative)**

**Activities:**

- Senior SWE fixes bugs
- QA adds missing tests
- Product reviews acceptance criteria
- All update documentation

**Output:**

- Fixed auth middleware application
- Added input validation
- Improved error handling (proper status codes)
- Added edge case tests
- Started API documentation

**Completion:** ✅ Improvements made, ready for next iteration

---

### Phase 5: Code Review

**Agent: Code Reviewer**

**Trigger:** PR created, CI checks passing

**Activities:**

- Reviews PR diff
- Checks code quality and standards
- Reviews test coverage
- Assesses security
- Provides feedback via GitHub PR review

**GitHub Workflow:**

```bash
# Check PR and CI status
gh pr view 1 --json state,statusCheckRollup
gh pr checks 1

# Review PR diff
gh pr diff 1

# After review, request changes
gh pr review 1 --request-changes --body "Please address the following:
- Critical: Auth middleware not applied to task routes
- High: Task creation validation needs fixing
- Medium: Error handling should return proper status codes"
```

**Output:**

```markdown
## Code Review Comments

### Critical Issues

- Auth middleware not applied to task routes (line 15 in tasks.js)
- Missing input validation for task creation

### High Priority

- Error handling returns 500 instead of proper status codes
- Test coverage below 80% for task routes

### Medium Priority

- Missing input sanitization
- Could improve error messages

### Low Priority

- Minor code style improvements
```

**Review Decision:** ⚠️ Request Changes

**Completion:** ✅ Review complete, changes requested

---

### Phase 7: Refinement (Code Review Response)

**Agent: Senior Software Engineer**

**Activities:**

- Reviews PR comments
- Addresses critical and high-priority issues
- Updates code
- Ensures CI still passes
- Requests re-review

**GitHub Workflow:**

```bash
# View review comments
gh pr view 1 --comments

# Address feedback and push (using conventional commits)
git add .
git commit -m "fix(api): address code review feedback" \
  -m "Addresses critical and high-priority review comments:
  - Apply auth middleware to task routes
  - Fix input validation for task creation
  - Improve error handling with proper status codes

  Addresses review comments on PR #1"
git push

# Check CI status
gh pr checks 1

# Request re-review
gh pr comment 1 --body "Addressed all critical and high-priority feedback. Ready for re-review."
```

**Output:**

- Fixed auth middleware application
- Added input validation
- Improved error handling
- CI still passing

**Completion:** ✅ Changes addressed, ready for re-review

---

### Phase 5: Code Review (Re-review)

**Agent: Code Reviewer**

**Activities:**

- Reviews updated PR
- Verifies issues are addressed
- Checks CI still passing
- Approves PR

**GitHub Workflow:**

```bash
# Check updated PR
gh pr diff 1

# Verify CI still passing
gh pr checks 1

# Approve PR
gh pr review 1 --approve --body "All critical issues addressed. LGTM!"
```

**Review Decision:** ✅ Approved

**Completion:** ✅ PR approved

---

## Iteration 2: Bug Fixes & Improvements

### Phase 4: Testing & Validation (Re-run)

**Agent: QA Engineer**

**Output:**

```markdown
# Test Results - Iteration 2

## Unit Tests

- ✅ All auth tests: PASS
- ✅ Task creation: PASS
- ✅ Task update: PASS
- ✅ Task deletion: PASS
- ⚠️ Edge case: Empty title validation: Needs test

## Integration Tests

- ✅ POST /tasks without auth: Returns 401 ✓
- ✅ GET /tasks with invalid token: Returns 401 ✓
- ✅ All CRUD operations: PASS

## Acceptance Criteria Validation

- ✅ All user stories: PASS

## Test Coverage

- Current: 75%
- Target: >80%
- Gap: Need edge case tests
```

**Completion:** ✅ Most tests passing, coverage improving

---

### Phase 6: Refinement (Continued)

**Agents: All**

**Activities:**

- Add edge case tests
- Improve test coverage to >80%
- Complete API documentation
- Write README

**Output:**

- Test coverage: 85% ✅
- API documentation complete ✅
- README with setup instructions ✅

**Completion:** ✅ All requirements met

---

## Iteration 3: Final Validation

### Phase 4: Final Testing

**Agent: QA Engineer**

**Output:**

```markdown
# Final Test Results

## All Tests: ✅ PASSING

- Unit tests: 45/45 passing
- Integration tests: 12/12 passing
- Test coverage: 85%

## Acceptance Criteria: ✅ ALL MET

- ✅ Email/password authentication working
- ✅ All CRUD operations functional
- ✅ Input validation in place
- ✅ Test coverage > 80%
- ✅ API documentation complete
- ✅ README with setup instructions

## Quality Gates: ✅ ALL PASSED

- ✅ All tests passing
- ✅ Coverage > 80%
- ✅ No critical bugs
- ✅ Documentation complete
```

**Completion:** ✅ All quality gates passed

---

### Phase 6: Final Review

**Agents: All**

**Final Assessment:**

```markdown
# Completion Assessment

## Requirements Status

✅ tRPC API: Complete
✅ Email/password authentication: Complete
✅ CRUD operations: Complete
✅ Input validation: Complete
✅ Tests (>80% coverage): Complete (85%)
✅ API documentation: Complete
✅ README: Complete

## Success Metrics

- All endpoints functional: ✅
- Test coverage: 85% (target: >80%) ✅
- Documentation: Complete ✅

## Conclusion

All requirements met. Product ready for completion.
```

**Completion Promise:**

```xml
<promise>COMPLETE</promise>
```

---

## Loop Summary

### Iterations: 3

### Total Phases Executed: 21 (7 phases × 3 iterations, including code review)

### Agents Involved: 5 (Marketing, Product, Senior SWE, QA, Code Reviewer)

### Key Learnings

1. **Iteration 1**: Initial implementation had bugs - normal and expected
2. **Iteration 2**: Fixed bugs, improved coverage
3. **Iteration 3**: Final validation and completion

### Agent Contributions

- **Marketing**: Provided market context and user personas
- **Product**: Created clear requirements and acceptance criteria
- **Senior SWE**: Built robust, testable code, addressed review feedback
- **QA**: Ensured quality and requirements validation
- **Code Reviewer**: Ensured code quality and standards before merge

### Success Factors

1. Clear requirements from Product Developer
2. Market context from Marketing helped prioritize features
3. Comprehensive testing caught issues early
4. Code review ensured quality before merge
5. CI checks (types, formatting, linting) enforced standards
6. GitHub workflow provided visibility and tracking
7. Iterative refinement improved quality
8. All agents collaborated effectively

---

## Alternative: Single Agent Mode

If running in single agent mode, the same agent would:

1. Research market (as Marketing)
2. Create PRD (as Product Developer)
3. Implement code (as Senior SWE)
4. Write and run tests (as QA Engineer)
5. Review and refine (as all roles)

**Trade-off**: Faster but potentially less thorough in each area.

---

## Example: Stuck Scenario

If the loop gets stuck (e.g., impossible requirement):

**After 15 iterations:**

```markdown
# Stuck Detection Report

## Blocking Issues

- Requirement: "Support 1M concurrent users"
- Current implementation: PostgreSQL (monolith)
- Attempted: Database optimizations, query optimization
- Still failing: Load tests fail at 10K concurrent users

## What Was Attempted

1. Database query optimizations
2. Connection pooling (Prisma)
3. Database indexes
4. Query optimization

## Alternative Approaches

1. Optimize database queries further
2. Add database read replicas (if needed)
3. Implement better caching strategies at application level
4. Simplify requirement to 5K concurrent users

## Recommendation

Either:

- Update requirement to match monolith capabilities
- Or optimize database queries and add indexes
```

Then either:

- Update requirements and continue
- Or output completion with limitations documented
