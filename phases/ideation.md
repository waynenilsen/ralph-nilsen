# Ideation Phase

In the ideation phase you're trying to figure out what to build. This phase can be skipped if the user provided a clear prompt with specific requirements.

## Objectives
- Understand the problem space
- Brainstorm potential solutions
- Validate feasibility
- Align on high-level direction

## Activities
1. Review any existing context in channel.md
2. Research the problem domain
3. Propose 2-3 solution approaches
4. Document findings in channel.md with @claude: prefix
5. Get user feedback via @user: entries

## Exit Criteria (Machine-Readable)

- [ ] IDEATION_01: Problem statement documented in channel.md or ideas/ directory
- [ ] IDEATION_02: At least one solution approach proposed and documented
- [ ] IDEATION_03: Solution direction selected (logged as @claude: or @user: decision)
- [ ] IDEATION_04: QA findings from previous cycle reviewed (if qa_findings.md exists)

## Inputs from Previous Cycle

If this is not the first cycle:
1. Check if `qa_findings.md` exists from previous cycle
2. Review bugs - these should be prioritized for immediate attention
3. Review improvements - consider as idea candidates
4. Consider tech debt items in planning

## Transition

When all exit criteria are checked:
1. Update `loop_state.md` with phase completion
2. Update `current_mode.md` to `prd` or `epic-planning`
3. Log transition to `channel.md`
