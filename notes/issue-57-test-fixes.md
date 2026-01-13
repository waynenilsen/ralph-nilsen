# Issue #57: Test Fixes

## Issues Found

### 1. Database Pool Management
- **Problem**: Multiple test files share a single pg Pool instance through `getTestPool()`
- **Symptom**: "Cannot use a pool after calling end on the pool" and "Called end on pool more than once" errors
- **Root Cause**: When tests run in parallel, each test file's `afterAll` hook tries to close the same shared pool
- **Solution**: Implement reference counting or use a test runner lifecycle hook to close the pool only once after all tests complete

### 2. MailHog Not Running
- **Problem**: Tests fail with `ECONNREFUSED fdf::1:1025` when trying to send emails
- **Symptom**: Email-related tests fail during signup, invitation, password reset flows
- **Root Cause**: MailHog Docker container is not running
- **Solution**: Docker daemon is not available in this environment. Need to either:
  a) Mock email sending in tests
  b) Make email sending failures non-fatal for tests
  c) Skip email verification in tests

### 3. E2E Test Failures
- **Problem**: Many E2E tests are failing to find elements or navigate properly
- **Symptom**: Multiple test failures in signup, signin, invitation, organization flows
- **Solution**: Need to investigate specific failures and update selectors/navigation logic

## Fix Strategy

1. Fix database pool management to prevent double-close errors
2. Handle email sending gracefully in tests (mock or make non-fatal)
3. Investigate and fix E2E test navigation issues
4. Re-run all tests to verify fixes
