# Implementation Phase

This phase executes the planned work and produces working code.

## Objectives

- Implement features according to plan
- Maintain code quality
- Document progress
- Create PRs for review

## Activities

1. Pick a task from the project board, move it into in progress.
2. Create a feature branch: `git checkout -b feature/<task-name>`
3. Implement the feature
4. Test locally
5. Log progress in channel.md
6. Commit with descriptive messages
7. Create PR when ready: `gh pr create --title "<title>" --body "<description>"`

## Best Practices

- Small, focused commits
- Self-documenting code
- Run tests before committing
- Keep PRs reviewable (not too large)

## Exit Criteria (Machine-Readable)

- [ ] IMPL_01: All tasks in current epic implemented
- [ ] IMPL_02: Code committed with descriptive messages
- [ ] IMPL_03: PR created for review
- [ ] IMPL_04: Progress logged to channel.md
- [ ] IMPL_05: Human approval received for PR (checkpoint)

## Human Checkpoint

**This phase requires human approval before transitioning.**

After completing IMPL_01 through IMPL_04:
1. Log to channel.md: `@claude: Implementation complete. PR ready for review.`
2. Wait for: `@user: approved` (or PR merge/approval)
3. Only proceed to QA after approval received

## Transition

When all exit criteria are checked (including IMPL_05 approval):
1. Update `loop_state.md` with phase completion
2. Update `current_mode.md` to `qa`
3. Log transition to `channel.md`

**CRITICAL**: Do not transition until ALL tasks from the epic are complete.
