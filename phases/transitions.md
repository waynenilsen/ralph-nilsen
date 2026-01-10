# Phase Transitions

This document defines the rules and validation logic for transitioning between phases in the Ralph-in-a-Loop workflow.

## State Machine

```
┌─────────────┐
│  ideation   │◄─────────────────────────────┐
└──────┬──────┘                              │
       │ IDEATION_* criteria met             │
       ▼                                     │
┌─────────────┐                              │
│    prd      │                              │
└──────┬──────┘                              │
       │ PRD_* criteria met                  │
       │ + HUMAN APPROVAL                    │
       ▼                                     │
┌─────────────┐                              │
│epic-planning│                              │
└──────┬──────┘                              │
       │ EPIC_* criteria met                 │
       ▼                                     │
┌─────────────┐                              │
│implementation│                             │
└──────┬──────┘                              │
       │ IMPL_* criteria met                 │
       │ + HUMAN APPROVAL                    │
       ▼                                     │
┌─────────────┐                              │
│     qa      │──────────────────────────────┘
└─────────────┘  QA_* criteria met + HUMAN SIGN-OFF
                 → next cycle
```

## Valid Transitions

| From | To | Requires Human Approval | Exit Criteria |
|------|----|------------------------|---------------|
| ideation | prd | No | IDEATION_01 through IDEATION_04 |
| prd | epic-planning | **Yes** | PRD_01 through PRD_05 |
| epic-planning | implementation | No | EPIC_01 through EPIC_05 |
| implementation | qa | **Yes** | IMPL_01 through IMPL_05 |
| qa | ideation | **Yes** | QA_01 through QA_06 |
| qa | implementation | No | Critical bugs found |

## Transition Procedure

### Pre-Transition Checklist

Before any transition, verify:

1. [ ] All exit criteria for current phase are satisfied
2. [ ] Human approval received (if required)
3. [ ] Progress logged to channel.md
4. [ ] loop_state.md is current

### Transition Steps

Execute in order:

1. **Validate exit criteria**
   - Check each criterion in the phase file
   - If any criterion not met, log gap to channel.md
   - Do not proceed until all criteria satisfied

2. **Check for human approval** (if required)
   - Look for `@user: approved` in channel.md (after last approval request)
   - Or interpret user's "continue" message as approval
   - If not present, wait (log waiting status)

3. **Update loop_state.md**
   ```markdown
   ## Phase History
   | Phase | Started | Completed | Notes |
   |-------|---------|-----------|-------|
   | <phase> | <start> | <now> | <summary> |
   ```

4. **Update current_mode.md**
   - Write single line with new phase name
   - Valid values: `ideation`, `prd`, `epic-planning`, `implementation`, `qa`

5. **Log transition to channel.md**
   ```
   @claude: Transitioning from <old_phase> to <new_phase>. Reason: <exit criteria satisfied>.
   ```

6. **Load new phase instructions**
   - Read `phases/<new_phase>.md`
   - Begin executing phase activities

## Failure Handling

### Exit Criteria Not Met

If criteria validation fails:

1. Log specific missing criteria to channel.md:
   ```
   @claude: Cannot transition. Missing: PRD_03 (GitHub issues not created).
   ```

2. Continue working on current phase to satisfy criteria

3. Re-check criteria after completing work

### Human Approval Timeout

If waiting for human approval:

1. Initial request logged: `@claude: Awaiting approval.`
2. On next session (if still waiting): Log reminder
3. Do not proceed without approval - human-in-the-loop is intentional

### Rollback Scenarios

| Scenario | Action |
|----------|--------|
| QA finds critical bugs | Transition QA → implementation (not ideation) |
| Implementation blocked | Stay in implementation, log blocker |
| Requirements unclear | May return PRD → ideation (rare) |

## Cycle Completion

When QA phase completes successfully:

1. Increment cycle number in loop_state.md
2. Clear current_work_item.md
3. QA findings become input to next ideation
4. Transition to ideation phase
5. Select next work item from project board

## Machine-Readable Summary

```yaml
transitions:
  ideation_to_prd:
    requires_approval: false
    criteria: [IDEATION_01, IDEATION_02, IDEATION_03, IDEATION_04]

  prd_to_epic_planning:
    requires_approval: true
    criteria: [PRD_01, PRD_02, PRD_03, PRD_04, PRD_05]

  epic_planning_to_implementation:
    requires_approval: false
    criteria: [EPIC_01, EPIC_02, EPIC_03, EPIC_04, EPIC_05]

  implementation_to_qa:
    requires_approval: true
    criteria: [IMPL_01, IMPL_02, IMPL_03, IMPL_04, IMPL_05]

  qa_to_ideation:
    requires_approval: true
    criteria: [QA_01, QA_02, QA_03, QA_04, QA_05, QA_06]

  qa_to_implementation:
    requires_approval: false
    condition: critical_bugs_found
```
