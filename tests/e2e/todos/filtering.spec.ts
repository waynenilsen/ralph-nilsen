import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * Todo Filtering E2E Tests
 *
 * Note: The filtering UI is not yet implemented in the todos page.
 * The API supports filtering by status, priority, and search text,
 * but the frontend doesn't expose these controls yet.
 *
 * These tests are skipped until the filtering UI is implemented.
 * When implementing filtering UI, add:
 * - Status filter dropdown (pending/completed)
 * - Priority filter dropdown (low/medium/high)
 * - Search input field
 * - Clear filters button
 */
test.describe("Todo Filtering", () => {
  let context: BrowserContext;
  let page: Page;
  const timestamp = Date.now();
  const testUser = {
    email: `todofilter-${timestamp}@example.com`,
    username: `todofilter${timestamp}`,
    password: "TestPassword123!",
  };

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    await page.goto("/signup");
    await page.fill("#email", testUser.email);
    await page.fill("#username", testUser.username);
    await page.fill("#password", testUser.password);
    await page.fill("#confirmPassword", testUser.password);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL("/app/todos", { timeout: 10000 });

    // Create test data: todos with different statuses and priorities
    const todos = [
      { title: "High Priority Task", priority: "High Priority" },
      { title: "Medium Priority Task", priority: "Medium Priority" },
      { title: "Low Priority Task", priority: "Low Priority" },
      { title: "Searchable Unique Text ABC123", priority: "Medium Priority" },
    ];

    for (const todo of todos) {
      await page.click("text=Add Todo");
      await page.fill('input[placeholder="What needs to be done?"]', `${todo.title} ${timestamp}`);
      await page.locator('[data-slot="select-trigger"]').click();
      await page.locator(`[data-slot="select-item"]:has-text("${todo.priority}")`).click();
      await page.click("button:has-text('Add Todo')");
      await expect(page.locator(`text=${todo.title} ${timestamp}`)).toBeVisible({ timeout: 10000 });
    }

    // Mark one todo as completed for status filtering tests
    const todoCard = page.locator(`[data-slot="card"]:has-text("Low Priority Task ${timestamp}")`);
    await todoCard.locator('[data-slot="checkbox"]').click();
    await page.waitForTimeout(500);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.skip("should filter by status - pending only", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has status filter
    // await page.click('[data-testid="status-filter"]');
    // await page.click('text=Pending');
    // await expect(page.locator(`text=High Priority Task ${timestamp}`)).toBeVisible();
    // await expect(page.locator(`text=Low Priority Task ${timestamp}`)).not.toBeVisible();
  });

  test.skip("should filter by status - completed only", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has status filter
    // await page.click('[data-testid="status-filter"]');
    // await page.click('text=Completed');
    // await expect(page.locator(`text=Low Priority Task ${timestamp}`)).toBeVisible();
    // await expect(page.locator(`text=High Priority Task ${timestamp}`)).not.toBeVisible();
  });

  test.skip("should filter by priority - high only", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has priority filter
    // await page.click('[data-testid="priority-filter"]');
    // await page.click('text=High');
    // await expect(page.locator(`text=High Priority Task ${timestamp}`)).toBeVisible();
    // await expect(page.locator(`text=Medium Priority Task ${timestamp}`)).not.toBeVisible();
    // await expect(page.locator(`text=Low Priority Task ${timestamp}`)).not.toBeVisible();
  });

  test.skip("should filter by priority - medium only", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has priority filter
    // await page.click('[data-testid="priority-filter"]');
    // await page.click('text=Medium');
    // await expect(page.locator(`text=Medium Priority Task ${timestamp}`)).toBeVisible();
  });

  test.skip("should filter by priority - low only", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has priority filter
    // await page.click('[data-testid="priority-filter"]');
    // await page.click('text=Low');
    // await expect(page.locator(`text=Low Priority Task ${timestamp}`)).toBeVisible();
  });

  test.skip("should search by text in title", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has search input
    // await page.fill('[data-testid="search-input"]', 'ABC123');
    // await expect(page.locator(`text=Searchable Unique Text ABC123 ${timestamp}`)).toBeVisible();
    // await expect(page.locator(`text=High Priority Task ${timestamp}`)).not.toBeVisible();
  });

  test.skip("should search by text case-insensitively", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has search input
    // await page.fill('[data-testid="search-input"]', 'abc123');
    // await expect(page.locator(`text=Searchable Unique Text ABC123 ${timestamp}`)).toBeVisible();
  });

  test.skip("should combine status and priority filters", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has both filters
    // await page.click('[data-testid="status-filter"]');
    // await page.click('text=Pending');
    // await page.click('[data-testid="priority-filter"]');
    // await page.click('text=High');
    // Only high priority pending todos should be visible
  });

  test.skip("should combine search with filters", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has search and filters
    // await page.fill('[data-testid="search-input"]', 'Priority');
    // await page.click('[data-testid="priority-filter"]');
    // await page.click('text=High');
    // Only matching todos should be visible
  });

  test.skip("should clear all filters", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has clear filters button
    // Apply some filters first
    // await page.click('[data-testid="status-filter"]');
    // await page.click('text=Pending');
    // await page.click('[data-testid="clear-filters"]');
    // All todos should be visible again
  });

  test.skip("should show empty state when no todos match filters", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has search
    // await page.fill('[data-testid="search-input"]', 'NonExistentTodoXYZ999');
    // await expect(page.locator('text=No todos match your filters')).toBeVisible();
  });

  test.skip("should persist filter state in URL", async () => {
    await page.goto("/app/todos");

    // TODO: Implement when UI has URL-based filter state
    // await page.click('[data-testid="priority-filter"]');
    // await page.click('text=High');
    // await expect(page).toHaveURL(/priority=high/);
    // await page.reload();
    // Filter should still be applied after reload
  });

  // This test verifies the current behavior: todos are visually grouped by status
  test("should group todos by status (current behavior)", async () => {
    await page.goto("/app/todos");

    // The current UI groups todos into "To Do" and "Completed" sections
    await expect(page.locator("text=To Do")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Completed")).toBeVisible({ timeout: 10000 });
  });
});
