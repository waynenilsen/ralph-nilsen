# Implementation Phase

This phase executes the planned work and produces working code.

## Objectives

- Implement features according to plan
- Maintain code quality
- Document progress
- Create PRs for review

## Activities

1. Pick a task from the project board
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

## Exit Criteria

- Feature implemented and tested
- PR created and ready for review
- All acceptance criteria met

## Transition

Update current_mode.md to `qa` when implementation complete - CRITICAL - if you did not pull the last ticket from the project then its not complete.
