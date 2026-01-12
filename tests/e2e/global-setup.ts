/**
 * Playwright global setup.
 *
 * This runs once before all E2E tests to prepare the test environment.
 */

import { FullConfig } from "@playwright/test";
import { clearMailHogEmails, checkMailHogConnection } from "../helpers/email";
import { withTestClient, cleanupTestData, getTestPool, closeTestPool } from "../helpers/setup";

async function globalSetup(_config: FullConfig): Promise<void> {
  console.log("\n🎭 Playwright Global Setup\n");

  // Verify database connection
  try {
    await withTestClient(async (client) => {
      await client.query("SELECT 1");
    });
    console.log("✅ Database connection verified");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw new Error("Cannot connect to test database. Is Docker running?");
  }

  // Clean up test data from previous runs
  try {
    await withTestClient(async (client) => {
      await cleanupTestData(client);
    });
    console.log("✅ Previous test data cleaned up");
  } catch (error) {
    console.error("⚠️  Warning: Could not clean up test data:", error);
  }

  // Check MailHog and clear emails
  const mailHogAvailable = await checkMailHogConnection();
  if (mailHogAvailable) {
    await clearMailHogEmails();
    console.log("✅ MailHog connected and emails cleared");
  } else {
    console.log("⚠️  MailHog not available - email tests may fail");
  }

  // Close the pool since tests will create their own connections
  await closeTestPool();

  console.log("\n✨ Global setup complete\n");
}

export default globalSetup;
