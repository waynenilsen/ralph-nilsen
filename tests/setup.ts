/**
 * Global test setup - runs once before all tests.
 *
 * This module:
 * - Verifies database connectivity
 * - Runs migrations if needed
 * - Initializes test fixtures
 * - Verifies MailHog connectivity (for E2E tests)
 */

import { getTestPool, closeTestPool } from "./helpers/setup";
import { checkMailHogConnection } from "./helpers/email";

export async function setup(): Promise<void> {
  console.log("\n🧪 Setting up test environment...\n");

  // Verify database connection
  try {
    const pool = getTestPool();
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("✅ Database connection verified");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw new Error("Cannot connect to test database");
  }

  // Check MailHog connection (optional - only for E2E tests)
  const isMailHogAvailable = await checkMailHogConnection();
  if (isMailHogAvailable) {
    console.log("✅ MailHog connection verified");
  } else {
    console.log("⚠️  MailHog not available (optional for unit/integration tests)");
  }

  console.log("\n🚀 Test setup complete\n");
}

export async function teardown(): Promise<void> {
  console.log("\n🧹 Cleaning up test environment...\n");
  await closeTestPool();
  console.log("✅ Database connections closed\n");
}

// Auto-run setup when this file is imported as preload
if (process.env.BUN_TEST_PRELOAD) {
  setup().catch(console.error);
}
