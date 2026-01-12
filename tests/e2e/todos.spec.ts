import { test, expect } from "@playwright/test";

test.describe("Todos", () => {
  let sessionCookie: string;
  const timestamp = Date.now();
  const testUser = {
    email: `todotest-${timestamp}@example.com`,
    username: `todotest${timestamp}`,
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

  test("should display todos page", async ({ page }) => {
    await page.goto("/app/todos");

    await expect(page.locator("text=My Todos")).toBeVisible();
    await expect(page.locator("text=Add Todo")).toBeVisible();
  });

  test("should show empty state when no todos", async ({ page }) => {
    await page.goto("/app/todos");

    await expect(page.locator("text=No todos yet")).toBeVisible({ timeout: 10000 });
  });

  test("should create a new todo", async ({ page }) => {
    await page.goto("/app/todos");

    // Click Add Todo button
    await page.click("text=Add Todo");

    // Fill in the form
    const todoTitle = `Test Todo ${Date.now()}`;
    await page.fill('input[placeholder="What needs to be done?"]', todoTitle);
    await page.fill('textarea[placeholder="Description (optional)"]', "This is a test description");
    await page.selectOption("select", "high");
    await page.click("button:has-text('Add Todo')");

    // The todo should appear
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=high")).toBeVisible();
  });

  test("should mark todo as completed", async ({ page }) => {
    await page.goto("/app/todos");

    // Create a todo first
    await page.click("text=Add Todo");
    const todoTitle = `Complete Me ${Date.now()}`;
    await page.fill('input[placeholder="What needs to be done?"]', todoTitle);
    await page.click("button:has-text('Add Todo')");

    // Wait for todo to appear
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible({ timeout: 10000 });

    // Click the checkbox to mark as complete
    await page
      .locator(`text=${todoTitle}`)
      .locator("..")
      .locator("..")
      .locator("button")
      .first()
      .click();

    // Should move to completed section
    await expect(page.locator("text=Completed")).toBeVisible({ timeout: 10000 });
  });

  test("should delete a todo", async ({ page }) => {
    await page.goto("/app/todos");

    // Create a todo first
    await page.click("text=Add Todo");
    const todoTitle = `Delete Me ${Date.now()}`;
    await page.fill('input[placeholder="What needs to be done?"]', todoTitle);
    await page.click("button:has-text('Add Todo')");

    // Wait for todo to appear
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible({ timeout: 10000 });

    // Hover to show delete button and click it
    const todoRow = page.locator(`text=${todoTitle}`).locator("..").locator("..");
    await todoRow.hover();

    // Click delete button (the one with trash icon)
    await todoRow.locator("button").last().click();

    // Todo should be gone
    await expect(page.locator(`text=${todoTitle}`)).not.toBeVisible({ timeout: 10000 });
  });
});
