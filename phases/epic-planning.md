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

## Exit Criteria
- All epics and tasks created as GitHub issues
- Clear implementation path established
- Ready for implementation phase

## Transition
Update current_mode.md to `implementation` when complete.
