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

## Exit Criteria
- All acceptance criteria verified
- No critical bugs outstanding
- Ready for merge/release

## Transition
- If bugs found: Update current_mode.md to `implementation`
- If passed: Merge PR and close related issues
