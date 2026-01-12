/**
 * Global test teardown - runs once after all tests.
 *
 * This module:
 * - Closes database connections
 * - Cleans up test data
 * - Releases any resources
 */

import { closeTestPool, withTestClient, cleanupTestData } from "./helpers/setup";

export async function teardown(): Promise<void> {
  console.log("\n🧹 Running global test teardown...\n");

  try {
    // Clean up any leftover test data
    await withTestClient(async (client) => {
      await cleanupTestData(client);
    });
    console.log("✅ Test data cleaned up");
  } catch (error) {
    console.error("⚠️  Error cleaning up test data:", error);
  }

  // Close database pool
  try {
    await closeTestPool();
    console.log("✅ Database connections closed");
  } catch (error) {
    console.error("⚠️  Error closing database pool:", error);
  }

  console.log("\n✨ Teardown complete\n");
}

// Export for manual use
export default teardown;
