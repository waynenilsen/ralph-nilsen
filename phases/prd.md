# PRD (Product Requirements Document) Phase

This phase defines what will be built in detail before implementation begins.

Create a new file in the ./prd directory

## Objectives

- Document clear requirements
- Define acceptance criteria
- Identify dependencies and constraints
- Establish success metrics

## Activities

1. Write detailed requirements based on ideation output
2. Break down features into testable user stories
3. Document technical constraints
4. Create or update GitHub issues via `gh issue create`
5. Log progress in channel.md

## Deliverables

- Requirements document (can be in GitHub issue or separate file)
- Acceptance criteria for each feature
- Updated project board items

## Exit Criteria (Machine-Readable)

- [ ] PRD_01: PRD document created in prd/ directory
- [ ] PRD_02: All requirements have acceptance criteria defined
- [ ] PRD_03: GitHub issues created for each requirement
- [ ] PRD_04: PRD logged to channel.md with file reference
- [ ] PRD_05: Human approval received (checkpoint)

## Human Checkpoint

**This phase requires human approval before transitioning.**

After completing PRD_01 through PRD_04:
1. Log to channel.md: `@claude: PRD complete. Awaiting approval.`
2. Wait for: `@user: approved` (or user message "continue")
3. Only proceed to transition after approval received

## Transition

When all exit criteria are checked (including PRD_05 approval):
1. Update `loop_state.md` with phase completion
2. Update `current_mode.md` to `epic-planning`
3. Log transition to `channel.md`
