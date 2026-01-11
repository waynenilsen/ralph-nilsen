import { test, expect } from "@playwright/test";

test.describe("Organizations", () => {
  let sessionCookie: string;
  const timestamp = Date.now();
  const testUser = {
    email: `orgtest-${timestamp}@example.com`,
    username: `orgtest${timestamp}`,
    password: "TestPassword123!",
  };

  test.beforeAll(async ({ browser }) => {
    // Create a test user and get session
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/signup");
    await page.fill("#email", testUser.email);
    await page.fill("#username", testUser.username);
    await page.fill("#password", testUser.password);
    await page.fill("#confirmPassword", testUser.password);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL("/app/todos", { timeout: 10000 });

    // Get session cookie
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "session_token");
    if (session) {
      sessionCookie = `session_token=${session.value}`;
    }

    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Set session cookie before each test
    if (sessionCookie) {
      const [, value] = sessionCookie.split("=");
      await page.context().addCookies([
        {
          name: "session_token",
          value: value!,
          domain: "localhost",
          path: "/",
        },
      ]);
    }
  });

  test("should display organizations page", async ({ page }) => {
    await page.goto("/app/organizations");

    await expect(page.locator("text=Organizations")).toBeVisible();
    await expect(page.locator("text=Create Organization")).toBeVisible();
  });

  test("should show default organization created during signup", async ({ page }) => {
    await page.goto("/app/organizations");

    // The default organization should be visible
    await expect(page.locator(`text=${testUser.username}'s Organization`)).toBeVisible({ timeout: 10000 });
  });

  test("should create new organization", async ({ page }) => {
    await page.goto("/app/organizations");

    await page.click("text=Create Organization");

    const newOrgName = `Test Org ${Date.now()}`;
    await page.fill('input[placeholder="Organization name"]', newOrgName);
    await page.click("button:has-text('Create')");

    // New organization should appear
    await expect(page.locator(`text=${newOrgName}`)).toBeVisible({ timeout: 10000 });
  });

  test("should switch between organizations", async ({ page }) => {
    // First create a new organization
    await page.goto("/app/organizations");

    await page.click("text=Create Organization");

    const newOrgName = `Switch Test ${Date.now()}`;
    await page.fill('input[placeholder="Organization name"]', newOrgName);
    await page.click("button:has-text('Create')");

    await expect(page.locator(`text=${newOrgName}`)).toBeVisible({ timeout: 10000 });

    // Click switch to this organization
    await page.click(`text=Switch to this organization`);

    // Page should reload - wait for it
    await page.waitForLoadState("networkidle");

    // The organization should now be marked as current
    await expect(page.locator("text=Current organization")).toBeVisible({ timeout: 10000 });
  });
});
