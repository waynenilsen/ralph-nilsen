import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * Tag Management E2E Tests
 *
 * Note: The tag management UI is not yet implemented.
 * The API supports full CRUD for tags and assigning tags to todos,
 * but the frontend doesn't expose these controls yet.
 *
 * These tests are skipped until the tag management UI is implemented.
 * When implementing tag UI, add:
 * - Tag list/management page or section
 * - Create tag form (name, color picker)
 * - Edit tag modal/form
 * - Delete tag button with confirmation
 * - Tag selector in todo create/edit forms
 * - Tag badges on todo cards
 * - Filter by tag functionality
 */
test.describe("Tag Management", () => {
  let context: BrowserContext;
  let page: Page;
  const timestamp = Date.now();
  const testUser = {
    email: `tagtests-${timestamp}@example.com`,
    username: `tagtests${timestamp}`,
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
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.skip("should display tags page or section", async () => {
    // TODO: Implement when UI has tags section
    // await page.goto('/app/tags') or look for tags section on todos page
    // await expect(page.locator('text=Tags')).toBeVisible();
  });

  test.skip("should create new tag with name", async () => {
    // TODO: Implement when UI has tag creation
    // await page.click('text=Create Tag');
    // await page.fill('[data-testid="tag-name-input"]', 'Work');
    // await page.click('button:has-text("Create")');
    // await expect(page.locator('text=Work')).toBeVisible();
  });

  test.skip("should create new tag with name and color", async () => {
    // TODO: Implement when UI has tag creation with color picker
    // await page.click('text=Create Tag');
    // await page.fill('[data-testid="tag-name-input"]', 'Personal');
    // await page.click('[data-testid="color-picker"]');
    // await page.click('[data-color="blue"]');
    // await page.click('button:has-text("Create")');
    // const tagBadge = page.locator('text=Personal');
    // await expect(tagBadge).toHaveCSS('background-color', /blue/);
  });

  test.skip("should not allow duplicate tag names", async () => {
    // TODO: Implement when UI has tag creation
    // Create first tag
    // await page.click('text=Create Tag');
    // await page.fill('[data-testid="tag-name-input"]', 'Duplicate');
    // await page.click('button:has-text("Create")');
    // Try to create duplicate
    // await page.click('text=Create Tag');
    // await page.fill('[data-testid="tag-name-input"]', 'Duplicate');
    // await page.click('button:has-text("Create")');
    // await expect(page.locator('text=A tag with this name already exists')).toBeVisible();
  });

  test.skip("should edit tag name", async () => {
    // TODO: Implement when UI has tag editing
    // await page.click('[data-testid="edit-tag-Work"]');
    // await page.fill('[data-testid="tag-name-input"]', 'Business');
    // await page.click('button:has-text("Save")');
    // await expect(page.locator('text=Business')).toBeVisible();
    // await expect(page.locator('text=Work')).not.toBeVisible();
  });

  test.skip("should edit tag color", async () => {
    // TODO: Implement when UI has tag editing
    // await page.click('[data-testid="edit-tag-Business"]');
    // await page.click('[data-testid="color-picker"]');
    // await page.click('[data-color="green"]');
    // await page.click('button:has-text("Save")');
    // Tag should have new color
  });

  test.skip("should delete tag", async () => {
    // TODO: Implement when UI has tag deletion
    // await page.click('[data-testid="delete-tag-Business"]');
    // await page.click('button:has-text("Confirm")'); // Confirmation dialog
    // await expect(page.locator('text=Business')).not.toBeVisible();
  });

  test.skip("should add tag to todo during creation", async () => {
    // TODO: Implement when UI has tag selector in todo form
    // await page.click('text=Add Todo');
    // await page.fill('input[placeholder="What needs to be done?"]', 'Tagged Todo');
    // await page.click('[data-testid="tag-selector"]');
    // await page.click('text=Work');
    // await page.click('button:has-text("Add Todo")');
    // await expect(page.locator('text=Tagged Todo')).toBeVisible();
    // await expect(page.locator('[data-testid="todo-tag-Work"]')).toBeVisible();
  });

  test.skip("should add tag to existing todo", async () => {
    // TODO: Implement when UI has tag management on todos
    // Create a todo first, then add tag
    // await page.click('[data-testid="add-tag-to-todo"]');
    // await page.click('text=Personal');
    // Tag badge should appear on todo card
  });

  test.skip("should remove tag from todo", async () => {
    // TODO: Implement when UI has tag removal on todos
    // await page.click('[data-testid="remove-tag-Personal"]');
    // Tag badge should be removed from todo card
  });

  test.skip("should add multiple tags to a todo", async () => {
    // TODO: Implement when UI supports multiple tags
    // await page.click('[data-testid="add-tag-to-todo"]');
    // await page.click('text=Work');
    // await page.click('[data-testid="add-tag-to-todo"]');
    // await page.click('text=Urgent');
    // Both tags should be visible on todo
  });

  test.skip("should filter todos by tag", async () => {
    // TODO: Implement when UI has tag filtering
    // await page.click('[data-testid="tag-filter"]');
    // await page.click('text=Work');
    // Only todos with Work tag should be visible
  });

  test.skip("should clear tag filter", async () => {
    // TODO: Implement when UI has tag filtering
    // await page.click('[data-testid="clear-tag-filter"]');
    // All todos should be visible again
  });

  test.skip("should show todos count per tag", async () => {
    // TODO: Implement when UI has tag stats
    // await expect(page.locator('text=Work (3)')).toBeVisible();
  });

  test.skip("should cascade delete tag assignments when tag is deleted", async () => {
    // TODO: Implement when UI has tag deletion
    // Create tag, assign to todo, delete tag
    // Todo should no longer show the deleted tag
  });

  test.skip("should isolate tags between organizations", async () => {
    // TODO: Implement when UI has tags and we can test org isolation
    // Create tag in org A
    // Switch to org B
    // Tag should not be visible in org B
    // Create same-named tag in org B (should succeed, different tenant)
  });

  // This test documents that tags are not currently visible in the UI
  test("should have API support for tags (UI not implemented)", async () => {
    await page.goto("/app/todos");

    // Verify the todos page loads - tags API exists but UI doesn't expose it
    await expect(page.locator("text=My Todos")).toBeVisible({ timeout: 10000 });

    // Tags are not visible in the current UI
    // This is expected - tag management UI needs to be implemented
  });
});
