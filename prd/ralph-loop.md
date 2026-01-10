# PRD: Ralph-in-a-Loop

## Overview

Enable the Ralph-Nilsen framework to operate as a continuous, self-sustaining development loop where Claude can autonomously cycle through all phases (Ideation -> PRD -> Epic Planning -> Implementation -> QA) and return to Ideation for the next iteration.

## Problem Statement

Currently, Ralph operates as a linear workflow requiring manual intervention to:
1. Transition between phases
2. Identify what to work on next after completing a cycle
3. Validate that work is complete before moving on
4. Feed learnings from QA back into new ideation

The framework lacks the automation and self-awareness to run continuously.

## Goals

1. **Autonomous Phase Transitions**: Ralph can determine when phase exit criteria are met and transition automatically
2. **Continuous Operation**: After QA completes, Ralph identifies the next work item and starts a new cycle
3. **Self-Improvement**: Learnings from each cycle feed into framework improvements
4. **Auditability**: All decisions and transitions are logged to channel.md

## Non-Goals

- Human-out-of-the-loop operation (human approval still required at key checkpoints)
- Multi-project parallelism (focus on single project loop first)
- External integrations beyond GitHub

## Requirements

### R1: Phase Completion Detection

**Description**: Ralph must be able to evaluate whether current phase exit criteria are satisfied.

**Acceptance Criteria**:
- [ ] Each phase file defines machine-parseable exit criteria
- [ ] A validation step checks criteria before transition
- [ ] Incomplete criteria are logged with specific gaps identified

### R2: Automatic Phase Transition

**Description**: When exit criteria are met, Ralph transitions to the next phase without manual intervention.

**Acceptance Criteria**:
- [ ] `current_mode.md` is updated automatically
- [ ] Transition is logged to `channel.md`
- [ ] Next phase instructions are loaded and followed

### R3: Work Item Selection

**Description**: At the start of each cycle, Ralph selects the highest priority work item from the project board.

**Acceptance Criteria**:
- [ ] Query GitHub project board via `gh project item-list`
- [ ] Select item based on priority/status
- [ ] Create `current_work_item.md` with selected item details
- [ ] Log selection rationale to channel.md

### R4: QA-to-Ideation Feedback Loop

**Description**: Findings from QA phase feed into the next ideation cycle.

**Acceptance Criteria**:
- [ ] QA phase produces a `qa_findings.md` summary
- [ ] Bugs and improvements are added to project backlog
- [ ] Next ideation cycle considers QA findings as input

### R5: Loop State Persistence

**Description**: The loop state survives session interruptions.

**Acceptance Criteria**:
- [ ] All state stored in files (not in-memory)
- [ ] `loop_state.md` tracks cycle count, current item, phase history
- [ ] Can resume from any interruption point

### R6: Human Checkpoint Integration

**Description**: Key decisions require human approval before proceeding.

**Acceptance Criteria**:
- [ ] PRD approval checkpoint before epic planning
- [ ] Implementation plan approval before coding
- [ ] QA sign-off before closing work item
- [ ] Checkpoints logged with `@user:` responses in channel.md

## Technical Design

### New Files

| File | Purpose |
|------|---------|
| `current_work_item.md` | Active work item details |
| `loop_state.md` | Cycle counter, history, resume point |
| `qa_findings.md` | Output from QA phase |
| `phases/transitions.md` | Transition rules and validation logic |

### Phase Exit Criteria Format

Each phase file will include a structured section:

```markdown
## Exit Criteria (Machine-Readable)

- [ ] CRITERIA_ID: Description
- [x] CRITERIA_ID: Completed description
```

### Loop Execution Flow

```
┌─────────────┐
│  Ideation   │◄─────────────────────────────┐
└──────┬──────┘                              │
       │ exit criteria met                   │
       ▼                                     │
┌─────────────┐                              │
│    PRD      │                              │
└──────┬──────┘                              │
       │ + human approval                    │
       ▼                                     │
┌─────────────┐                              │
│Epic Planning│                              │
└──────┬──────┘                              │
       │ exit criteria met                   │
       ▼                                     │
┌─────────────┐                              │
│Implementation│                             │
└──────┬──────┘                              │
       │ + human approval                    │
       ▼                                     │
┌─────────────┐                              │
│     QA      │──────────────────────────────┘
└─────────────┘  findings → backlog → next cycle
```

## Success Metrics

1. **Cycle Completion Rate**: % of cycles that complete all 5 phases without manual intervention (target: 80%)
2. **Mean Time Per Cycle**: Average time from ideation start to QA completion
3. **Defect Escape Rate**: Bugs found post-QA vs during QA
4. **Self-Improvement Velocity**: Framework improvements implemented per cycle

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Infinite loop on failed criteria | High | Max retry count, escalate to human after 3 attempts |
| Stale project board | Medium | Sync project board at cycle start |
| Context loss between sessions | High | Comprehensive state files, resume logic |

## Open Questions

1. Should there be a "pause" state for extended human review?
2. How to handle blocked work items (external dependencies)?
3. What triggers framework self-improvement vs regular feature work?

## Timeline

Phase 1: Core loop mechanics (R1, R2, R5)
Phase 2: Work item selection (R3)
Phase 3: QA feedback loop (R4)
Phase 4: Human checkpoints (R6)
