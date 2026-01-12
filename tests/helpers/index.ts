/**
 * Test helpers index.
 *
 * Re-exports all test helpers for convenient imports.
 *
 * Usage:
 *   import { createTestTenant, createTestUser, withTestClient } from "@/tests/helpers";
 */

// Database utilities
export {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  setTenantContext,
  resetTenantContext,
} from "./setup";

export {
  withRollbackTransaction,
  withTenantRollbackTransaction,
  withTenantContext,
  withTenantTransaction,
  checkDatabaseConnection,
  getTableCount,
  recordExists,
  deleteRecord,
  truncateTables,
  waitForCondition,
} from "./db";

// Test fixtures
export {
  TEST_PASSWORD,
  createTestTenant,
  createTestUser,
  createTestUserTenant,
  createTestSession,
  createTestApiKey,
  createTestUserWithSession,
  createTestUserWithApiKey,
  createTestTodo,
  createTestTodos,
  createTestTag,
  addTagToTodo,
  createTestTodoWithTags,
  createTestPasswordResetToken,
  createExpiredPasswordResetToken,
  seedTestEnvironment,
  generateTestEmail,
  generateTestUsername,
  generateTestSlug,
} from "./fixtures";

// API client helpers
export {
  createMockContext,
  createPublicCaller,
  createSessionCaller,
  createApiKeyCaller,
  createAdminCaller,
  createTenantOnlyCaller,
  createTestUserObject,
  createTestTenantObject,
  createTestSessionObject,
  createTestApiKeyObject,
  createAuthenticatedTestContext,
  createApiKeyTestContext,
  type TRPCCaller,
} from "./api";

// Email helpers
export {
  checkMailHogConnection,
  getMailHogEmails,
  getEmailsTo,
  getLatestEmailTo,
  waitForEmail,
  getEmailSubject,
  getEmailBody,
  getEmailRawData,
  extractResetToken,
  extractVerificationToken,
  clearMailHogEmails,
  deleteEmail,
  assertEmailReceived,
  assertNoEmailReceived,
  type MailHogMessage,
  type MailHogResponse,
} from "./email";
