# QA (Quality Assurance) Phase

This phase validates that implementation meets requirements.

## Objectives
- Verify acceptance criteria
- Test edge cases
- Validate user experience
- Ensure no regressions

## Activities
1. Review acceptance criteria from PRD
2. Test each requirement systematically
3. Document test results in channel.md
4. Report bugs as GitHub issues: `gh issue create --label "bug"`
5. Verify fixes

## Test Types
- Functional testing: Does it work as specified?
- Edge case testing: How does it handle unusual inputs?
- Integration testing: Does it work with existing features?
- Regression testing: Did we break anything?

## Exit Criteria (Machine-Readable)

- [ ] QA_01: All acceptance criteria from PRD tested
- [ ] QA_02: Test results documented in channel.md
- [ ] QA_03: qa_findings.md created with findings summary
- [ ] QA_04: Bugs filed as GitHub issues (if any found)
- [ ] QA_05: No critical/blocking bugs outstanding
- [ ] QA_06: Human sign-off received (checkpoint)

## Human Checkpoint

**This phase requires human sign-off before closing the cycle.**

After completing QA_01 through QA_05:
1. Log to channel.md: `@claude: QA complete. Ready for sign-off.`
2. Wait for: `@user: approved` (or equivalent sign-off)
3. Only proceed to close work item and start next cycle after sign-off

## QA Findings Output

Create `qa_findings.md` with:
- Summary of testing performed
- Bugs found (with severity)
- Improvement suggestions
- Tech debt identified
- Recommendations for next cycle

## Transition

When all exit criteria are checked (including QA_06 sign-off):
1. Update `loop_state.md` with cycle completion
2. Archive `qa_findings.md` to `qa_archive/` (optional)
3. Clear `current_work_item.md` for next selection
4. Update `current_mode.md` to `ideation` (start next cycle)
5. Log cycle completion to `channel.md`

**If critical bugs found**: Return to `implementation` phase instead.
