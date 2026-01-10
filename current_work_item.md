# Current Work Item

The active work item for this development cycle.

## Selected Item

- **Issue**: #9
- **Title**: Epic: Core Loop Mechanics
- **URL**: https://github.com/waynenilsen/ralph-nilsen/issues/9
- **Selected**: 2026-01-10
- **Cycle**: 1

## Selection Rationale

This epic was selected because:

1. It is the foundational epic - other epics depend on it
2. Contains R1 (Phase Completion Detection), R2 (Automatic Transition), R5 (State Persistence)
3. Must be complete before Work Item Management or QA Feedback can function

## Related Tasks

| Task                               | Issue | Status   |
| ---------------------------------- | ----- | -------- |
| Create loop_state.md structure     | #13   | Complete |
| Add machine-readable exit criteria | #14   | Complete |
| Create phases/transitions.md       | #15   | Complete |
| Implement automatic mode updates   | #16   | Complete |

## Work Item Selection Process

At the start of each cycle, select work items using:

```bash
# List project items
gh project item-list 10 --owner waynenilsen --format json

# Never list open issues by label, we must use the project.
#gh issue list --label "priority:high" --state open
#gh issue list --label "bug" --state open
```

### Selection Priority

1. **Critical bugs** from previous QA cycle
2. **High priority** items from project board
3. **Dependencies** - items that unblock other work
4. **Epics** before individual tasks (complete full features)

### After Selection

1. Update this file with selected item details
2. Log selection to channel.md: `@claude: Selected work item #<number> - <title>. Rationale: <reason>`
3. Begin ideation phase (or skip to PRD if requirements clear)
