# Epic Planning Phase

This phase breaks down PRD requirements into implementable epics and tasks.

## Objectives
- Decompose requirements into epics
- Create actionable tasks
- Establish implementation order
- Identify blockers and dependencies

## Activities
1. Review PRD requirements
2. Group related requirements into epics
3. Create GitHub issues for each epic: `gh issue create --title "Epic: <name>" --body "<description>"`
4. Break epics into implementation tasks
5. Order tasks by dependency and priority
6. Update project board: `gh project item-add <project-number> --owner <owner> --url <issue-url>`

## Deliverables
- Epic issues created in GitHub
- Task breakdown documented
- Implementation order defined

## Exit Criteria (Machine-Readable)

- [ ] EPIC_01: All PRD requirements grouped into epics
- [ ] EPIC_02: Epic issues created in GitHub (titled "Epic: <name>")
- [ ] EPIC_03: Each epic broken into implementation tasks
- [ ] EPIC_04: Implementation order documented (implementation_order.md or in channel.md)
- [ ] EPIC_05: Dependencies between tasks identified

## Transition

When all exit criteria are checked:
1. Update `loop_state.md` with phase completion
2. Update `current_mode.md` to `implementation`
3. Log transition to `channel.md`
