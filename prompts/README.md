# Ralph SDLC Prompts

A comprehensive collection of prompts for implementing the Ralph SDLC Loop - an enhanced iterative development methodology that encompasses the complete Software Development Life Cycle with specialized agent personas.

## Overview

The Ralph SDLC Loop extends the original Ralph technique to include the full software development lifecycle, from ideation through deployment and refinement. The system uses specialized agent personas, each bringing their expertise to different phases of development.

## Tech Stack

All projects use the following technology stack:

- **Runtime**: Bun (not Node.js/npm/yarn)
- **Framework**: Next.js (App Router) - monolith architecture
- **Database**: PostgreSQL via Docker Compose
- **ORM**: Prisma
- **API Layer**: tRPC with TanStack Query (not REST API)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: Session-based email/password (home-rolled, no auth libraries)
- **Email Testing**: MailHog for local email testing
- **External Services**: Only Stripe is allowed

**Development Requirements:**

- Port numbers must be randomly generated (50000-60000) before hardcoding
- PostgreSQL runs via Docker Compose
- `.env.local` checked into git with all configs
- Database seeders with good test data always included
- Everything runs 100% on laptop - `bun dev` works after fresh checkout
- Queue system (if needed): worker polling PostgreSQL table (no Redis/external queues)

## Core Documents

### [Ralph SDLC Agent](./ralph-sdlc-agent.md)

The main orchestrator prompt that defines the SDLC loop methodology, phases, and how agents work together. Start here to understand the overall system.

**Key Features:**

- 6-phase SDLC (Ideation → Planning → Implementation → Testing → Review → Refinement)
- Self-referential learning loops
- Multi-agent collaboration framework
- Completion criteria and quality gates

## Agent Personas

### [Product Developer](./product-developer.md)

**Primary Role**: Requirements & Planning phase

- Creates comprehensive Product Requirements Documents (PRDs)
- Defines user stories and acceptance criteria
- Manages stakeholder alignment
- Ensures user-centric requirements

**Best For**: Requirements gathering, PRD creation, user story definition

### [Senior Software Engineer](./senior-software-engineer.md)

**Primary Role**: Implementation phase

- Designs system architecture and technical approach
- Writes clean, maintainable, well-tested code
- Ensures code quality and best practices
- Provides technical leadership

**Best For**: Architecture design, code implementation, technical decisions

### [QA Engineer](./qa-engineer.md)

**Primary Role**: Testing & Validation phase

- Creates comprehensive test strategy
- Writes and executes automated tests
- Validates functionality and quality
- Ensures requirements are met

**Best For**: Test planning, test automation, quality assurance, bug detection

### [Marketing & Market Research](./marketing-market-research.md)

**Primary Role**: Ideation & Discovery phase

- Conducts market and user research
- Defines user personas and market positioning
- Analyzes competitive landscape
- Validates product-market fit

**Best For**: Market research, user personas, competitive analysis, go-to-market strategy

## Supporting Documents

### [What Makes a Good PRD](./what-makes-a-good-prd.md)

Comprehensive guide on creating excellent Product Requirements Documents.

**Covers:**

- 12 characteristics of good PRDs
- Common pitfalls to avoid
- Quality checklist
- Best practices

### [Product Issue Management](./product-issue-management.md)

Guide for Product Developers on creating high-quality GitHub Issues and organizing them into epics.

**Covers:**

- Issue structure and templates
- Creating issues with GitHub CLI
- Organizing issues into epics
- Using GitHub Projects
- Best practices for issue creation

### [SWE Ticket Selection](./swe-ticket-selection.md)

Guide for Software Engineers on selecting tickets from the backlog.

**Covers:**

- Backlog selection principles
- Evaluating ticket readiness
- Using GitHub CLI to explore backlog
- What makes a good ticket (edge cases, files, best practices)
- Working with epics

### [Conventional Commits](./conventional-commits.md)

Guide for using Conventional Commits specification for commit messages.

**Covers:**

- Commit message structure and format
- Commit types (feat, fix, docs, etc.)
- Scopes and descriptions
- Breaking changes
- Best practices and examples
- GitHub integration

**Hard Requirement**: All commits must follow Conventional Commits format.

## How to Use

### Single Agent Mode

Use one agent persona for the entire SDLC:

```bash
/ralph-loop "Build a todo API" --completion-promise "COMPLETE"
# Agent operates as Product Developer + Senior SWE + QA Engineer
```

### Multi-Agent Mode

Use specialized agents for each phase:

```bash
# Phase 1: Marketing & Market Research
# Phase 2: Product Developer
# Phase 3: Senior Software Engineer
# Phase 4: QA Engineer
# Phase 5: Code Reviewer
# Phase 6-7: All agents collaborate
```

### Hybrid Mode

Select agents based on task needs:

- Requirements task → Product Developer
- Implementation task → Senior Software Engineer
- Testing task → QA Engineer
- Code review task → Code Reviewer
- Research task → Marketing & Market Research

## GitHub-Centric Workflow

**Hard Requirements:**

- GitHub is the source of truth for all work
- All code changes go through GitHub PRs
- Work tracked in GitHub Issues
- Planning in GitHub Projects (Kanban/Cycle/Waterfall)
- CI via GitHub Actions (types, formatting, linting)
- GitHub CLI (`gh`) is primary tool for GitHub interactions

**CI Requirements (Hard Requirements):**

- Type checking must pass
- Formatting must be correct
- Linting must pass
- All CI checks must pass before code review
- Never merge PRs with failing CI

## SDLC Phase Flow

```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Ideation & Discovery                         │
│  Agent: Marketing & Market Research                     │
│  Output: Market research, user personas, problem def    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 2: Requirements & Planning                       │
│  Agent: Product Developer                               │
│  Output: PRD, user stories, acceptance criteria         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 3: Implementation                                │
│  Agent: Senior Software Engineer                        │
│  Output: Codebase, tests, documentation                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 4: Testing & Validation                          │
│  Agent: QA Engineer                                     │
│  Output: Test results, bug Issues, CI verification       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 5: Code Review                                   │
│  Agent: Code Reviewer                                   │
│  Output: PR review, approval or changes requested       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 6: Review & Analysis                             │
│  Agents: All (collaborative)                            │
│  Output: Gap analysis, improvement recommendations       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 7: Refinement & Iteration                        │
│  Agents: All (collaborative)                            │
│  Output: Improvements, fixes, PR updates                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
            ┌──────────────┐
            │   Complete?  │
            └──────┬───────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
      YES                 NO
         │                   │
         │                   └──► Loop back to Phase 1-7
         │
         ▼
  <promise>COMPLETE</promise>
```

## Best Practices

### 1. Start with Ideation

Always begin with market research and problem understanding. Don't jump straight to implementation.

### 2. Use Appropriate Agents

Match agent personas to the task at hand for best results.

### 3. Iterate Through Phases

Don't skip phases. Each builds on the previous.

### 4. Collaborate Across Agents

Agents should review each other's work and provide input.

### 5. Set Clear Completion Criteria

Define measurable success criteria for each phase and overall completion.

### 6. Use Safety Mechanisms

Always set `--max-iterations` to prevent infinite loops.

## Example Workflow

See [Example Loop](./example-loop.md) for a detailed walkthrough of a complete Ralph SDLC loop with all agents.

**Quick Example:**

```bash
# Start Ralph SDLC Loop
/ralph-loop "Build a task management app with user authentication.
Requirements: Next.js monolith, session-based auth, CRUD operations, input validation,
comprehensive tests, API documentation. Output <promise>COMPLETE</promise>
when all requirements met and tests passing." \
  --completion-promise "COMPLETE" \
  --max-iterations 50
```

**Expected Flow:**

1. **Marketing**: Researches task management market, defines user personas, creates GitHub Issues
2. **Product**: Creates PRD with user stories, organizes in GitHub Projects
3. **Senior SWE**: Designs architecture, implements tRPC procedures with tests, creates PR with passing CI
4. **QA**: Executes tests, validates requirements, creates GitHub Issues for bugs
5. **Code Reviewer**: Reviews PR, provides feedback, approves or requests changes
6. **Senior SWE**: Addresses review feedback, updates PR
7. **All**: Review and identify gaps
8. **All**: Refine and iterate until complete

## References

- Original Ralph technique: https://ghuntley.com/ralph/
- Ralph Orchestrator: https://github.com/mikeyobrien/ralph-orchestrator

## File Structure

```
prompts/
├── README.md                          # This file - overview and index
├── ralph-sdlc-agent.md                # Main SDLC orchestrator
├── product-developer.md               # Product Developer persona
├── senior-software-engineer.md        # Senior SWE persona
├── qa-engineer.md                     # QA Engineer persona
├── code-reviewer.md                   # Code Reviewer persona
├── marketing-market-research.md       # Marketing & Market Research persona
├── what-makes-a-good-prd.md          # PRD best practices guide
├── product-issue-management.md       # Product issue creation and epic organization
├── swe-ticket-selection.md            # SWE ticket selection guide
├── conventional-commits.md            # Conventional commits specification guide
└── example-loop.md                    # Detailed example of complete loop
```

## Contributing

When adding new prompts or personas:

1. Follow the existing structure and format
2. Define clear role, responsibilities, and expertise
3. Map responsibilities to SDLC phases
4. Include quality checklists and success indicators
5. Link to related documents
6. Update this README
