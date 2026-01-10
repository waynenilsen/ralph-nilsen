# Implementation Order: Ralph-in-a-Loop

## Phase 1: Core Loop Mechanics (Epic #9)

**Goal**: Establish foundation for autonomous phase cycling.

| Order | Task | Issue | Depends On |
|-------|------|-------|------------|
| 1.1 | Create loop_state.md structure | #13 | None |
| 1.2 | Add machine-readable exit criteria to phases | #14 | #13 |
| 1.3 | Create phases/transitions.md | #15 | #14 |
| 1.4 | Implement automatic current_mode.md updates | #16 | #15 |

## Phase 2: Work Item Management (Epic #10)

**Goal**: Enable automatic selection of work from project board.

| Order | Task | Issue | Depends On |
|-------|------|-------|------------|
| 2.1 | Implement work item selection | #17 | Phase 1 complete |

## Phase 3: QA Feedback Loop (Epic #11)

**Goal**: Connect QA output to next ideation cycle.

| Order | Task | Issue | Depends On |
|-------|------|-------|------------|
| 3.1 | Create qa_findings.md template | #18 | Phase 1 complete |
| 3.2 | Update ideation to consume QA findings | #19 | #18 |

## Phase 4: Human Checkpoint Integration (Epic #12)

**Goal**: Add approval gates at critical transitions.

| Order | Task | Issue | Depends On |
|-------|------|-------|------------|
| 4.1 | Define checkpoint locations and mechanism | #20 | Phase 1 complete |
| 4.2 | Implement approval timeout and escalation | #21 | #20 |

## Summary

- **Total Epics**: 4
- **Total Tasks**: 9
- **Critical Path**: #13 → #14 → #15 → #16 → remaining tasks
- **Parallelizable**: After Phase 1, Phases 2-4 can proceed in parallel

## Next Step

Transition to implementation phase and begin with Task #13: Create loop_state.md structure.
