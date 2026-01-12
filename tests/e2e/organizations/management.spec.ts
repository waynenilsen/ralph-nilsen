import { test, expect, type Page, type BrowserContext } from "@playwright/test";

test.describe("Organization Management", () => {
  let context: BrowserContext;
  let page: Page;
  const timestamp = Date.now();
  const testUser = {
    email: `orgmgmt-${timestamp}@example.com`,
    username: `orgmgmt${timestamp}`,
    password: "TestPassword123!",
  };

  test.beforeAll(async ({ browser }) => {
    // Create a test user and get session
    context = await browser.newContext();
    page = await context.newPage();

    await page.goto("/signup");
    await page.fill("#email", testUser.email);
    await page.fill("#username", testUser.username);
    await page.fill("#password", testUser.password);
    await page.fill("#confirmPassword", testUser.password);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL("/app/todos", { timeout: 10000 });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("should display organizations page with default org", async () => {
    await page.goto("/app/organizations");
    await page.waitForLoadState("networkidle");

    // Use heading selector to be specific about the Organizations heading
    await expect(page.locator("h1:has-text('Organizations')")).toBeVisible();
    await expect(page.locator("text=Create Organization")).toBeVisible();
    // Default org created during signup - check for the org card with username in title
    await expect(page.locator(`[data-slot="card-title"]:has-text("${testUser.username}")`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show current organization indicator", async () => {
    await page.goto("/app/organizations");

    // The default organization should be marked as current
    await expect(page.locator("text=Current organization")).toBeVisible({ timeout: 10000 });
  });

  test("should create new organization", async () => {
    await page.goto("/app/organizations");

    await page.click("text=Create Organization");

    const newOrgName = `Test Org ${Date.now()}`;
    await page.fill('input[placeholder="Organization name"]', newOrgName);
    await page.click("button:has-text('Create')");

    // New organization should appear in the list
    await expect(page.locator(`text=${newOrgName}`)).toBeVisible({ timeout: 10000 });
  });

  test("should switch between organizations", async () => {
    await page.goto("/app/organizations");

    // Create a new organization for switching
    await page.click("text=Create Organization");
    const switchOrgName = `Switch Test ${Date.now()}`;
    await page.fill('input[placeholder="Organization name"]', switchOrgName);
    await page.click("button:has-text('Create')");

    await expect(page.locator(`text=${switchOrgName}`)).toBeVisible({ timeout: 10000 });

    // Find the card with our new org and click switch - use article/section container
    const orgCard = page.locator(`[data-slot="card"]:has-text("${switchOrgName}")`);
    await orgCard.locator("text=Switch to this organization").click();

    // Page will reload
    await page.waitForLoadState("networkidle");

    // The new organization should now be marked as current
    await page.goto("/app/organizations");
    await page.waitForLoadState("networkidle");
    const newOrgCard = page.locator(`[data-slot="card"]:has-text("${switchOrgName}")`);
    await expect(newOrgCard.locator("text=Current organization")).toBeVisible({ timeout: 10000 });
  });

  test("should verify todo isolation between organizations", async () => {
    // This test verifies that todos created in one organization
    // are not visible when switching to a different organization.

    // Create first organization and add a todo
    await page.goto("/app/organizations");
    await page.waitForLoadState("networkidle");
    await page.click("text=Create Organization");
    const org1Name = `Isolation Org A ${Date.now()}`;
    await page.fill('input[placeholder="Organization name"]', org1Name);
    await page.click("button:has-text('Create')");
    await expect(page.locator(`text=${org1Name}`)).toBeVisible({ timeout: 10000 });

    // Switch to org 1 - the page reloads after switch
    const org1Card = page.locator(`[data-slot="card"]:has-text("${org1Name}")`);
    await org1Card.locator("text=Switch to this organization").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // Extra wait for session to propagate

    // Create a todo in org 1 with a unique identifier
    await page.goto("/app/todos");
    await page.waitForLoadState("networkidle");
    await page.click("text=Add Todo");
    const uniqueId = Date.now();
    const org1Todo = `IsolationTest_Org1_${uniqueId}`;
    await page.fill('input[placeholder="What needs to be done?"]', org1Todo);
    await page.click("button:has-text('Add Todo')");
    await expect(page.locator(`text=${org1Todo}`)).toBeVisible({ timeout: 10000 });

    // Create second organization
    await page.goto("/app/organizations");
    await page.waitForLoadState("networkidle");
    await page.click("text=Create Organization");
    const org2Name = `Isolation Org B ${uniqueId}`;
    await page.fill('input[placeholder="Organization name"]', org2Name);
    await page.click("button:has-text('Create')");
    await expect(page.locator(`text=${org2Name}`)).toBeVisible({ timeout: 10000 });

    // Switch to org 2
    const org2Card = page.locator(`[data-slot="card"]:has-text("${org2Name}")`);
    await org2Card.locator("text=Switch to this organization").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // Extra wait for session to propagate

    // Verify org1's todo is NOT visible in org 2
    await page.goto("/app/todos");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`text=${org1Todo}`)).not.toBeVisible({ timeout: 5000 });

    // Create a todo in org 2
    await page.click("text=Add Todo");
    const org2Todo = `IsolationTest_Org2_${uniqueId}`;
    await page.fill('input[placeholder="What needs to be done?"]', org2Todo);
    await page.click("button:has-text('Add Todo')");
    await expect(page.locator(`text=${org2Todo}`)).toBeVisible({ timeout: 10000 });

    // Switch back to org 1
    await page.goto("/app/organizations");
    await page.waitForLoadState("networkidle");
    const org1CardAgain = page.locator(`[data-slot="card"]:has-text("${org1Name}")`);
    await org1CardAgain.locator("text=Switch to this organization").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // Extra wait for session to propagate

    // Verify org1's todo is visible and org2's todo is NOT visible
    await page.goto("/app/todos");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`text=${org1Todo}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${org2Todo}`)).not.toBeVisible({ timeout: 5000 });
  });

  test("should display organization role badge", async () => {
    await page.goto("/app/organizations");

    // The user should have 'owner' role on their created orgs
    await expect(page.locator("text=owner").first()).toBeVisible({ timeout: 10000 });
  });

  test("should not allow creating organization with empty name", async () => {
    await page.goto("/app/organizations");

    await page.click("text=Create Organization");

    // Try to submit with empty name - button should be disabled
    const createButton = page.locator("button:has-text('Create')");
    await expect(createButton).toBeDisabled();
  });

  test("should cancel organization creation", async () => {
    await page.goto("/app/organizations");

    await page.click("text=Create Organization");

    // The form should be visible
    await expect(page.locator('input[placeholder="Organization name"]')).toBeVisible();

    // Click cancel
    await page.click("button:has-text('Cancel')");

    // Form should close, and Create Organization button should be visible again
    await expect(page.locator('input[placeholder="Organization name"]')).not.toBeVisible();
    await expect(page.locator("text=Create Organization")).toBeVisible();
  });
});
