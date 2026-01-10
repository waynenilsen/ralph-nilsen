# Ralph-Nilsen Framework

An agentic development workflow using Claude with structured phases and IRC-style communication logging.

## Quick Start

1. Check `current_project.md` for the active GitHub project
2. Check `current_mode.md` for the current phase
3. Read the corresponding phase file in `phases/`
4. Log all activity to `channel.md`

## Phases

you must not skip steps, never skip steps

| #   | Phase          | File                         | Purpose                |
| --- | -------------- | ---------------------------- | ---------------------- |
| 1   | Ideation       | `./phases/ideation.md`       | Discover what to build |
| 2   | PRD            | `./phases/prd.md`            | Document requirements  |
| 3   | Epic Planning  | `./phases/epic-planning.md`  | Break down into tasks  |
| 4   | Implementation | `./phases/implementation.md` | Write the code         |
| 5   | QA             | `./phases/qa.md`             | Test and validate      |

## Communication Protocol

All activity is logged to `channel.md` in IRC-style format:

```
@claude: Starting implementation of feature X
@user: Please also add tests for edge cases
@claude: Updated to include edge case tests, see @./tests/feature_test.py
```

Rules:

- Each message on a single line
- Prefix with `@username:` (e.g., `@claude:`, `@user:`)
- Reference files with `@./relative/path`
- Reference other users with `@username`

## Tools

We use the `gh` CLI for GitHub operations:

- `gh issue create` - Create issues
- `gh pr create` - Create pull requests
- `gh project` - Manage project boards

## Environment

Running in Docker sandbox:

- No nested Docker available
- Can install any packages needed
- Full filesystem access

## Workflow

1. Always check current_mode.md before starting
2. Follow phase-specific instructions
3. Log progress to channel.md
4. Create PR when work is complete
5. Update current_mode.md when transitioning phases

## Self-Improvement Note

This framework is a work in progress. The first goal is self-improvement of the framework itself.

Update current_mode.md when transitioning phases
Update current_mode.md when transitioning phases
Update current_mode.md when transitioning phases
Update current_mode.md when transitioning phases
Update current_mode.md when transitioning phases

If you make changes, add them to git create a feature branch and make a pr.
