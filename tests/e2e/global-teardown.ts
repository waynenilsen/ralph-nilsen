/**
 * Playwright global teardown.
 *
 * This runs once after all E2E tests to clean up the test environment.
 */

import { FullConfig } from "@playwright/test";
import { withTestClient, cleanupTestData, closeTestPool } from "../helpers/setup";

async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log("\n🧹 Playwright Global Teardown\n");

  // Clean up test data
  try {
    await withTestClient(async (client) => {
      await cleanupTestData(client);
    });
    console.log("✅ Test data cleaned up");
  } catch (error) {
    console.error("⚠️  Warning: Could not clean up test data:", error);
  }

  // Close database connections
  try {
    await closeTestPool();
    console.log("✅ Database connections closed");
  } catch (error) {
    console.error("⚠️  Warning: Could not close database pool:", error);
  }

  console.log("\n✨ Global teardown complete\n");
}

export default globalTeardown;
