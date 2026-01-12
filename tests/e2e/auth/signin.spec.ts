import { test, expect } from "@playwright/test";
import { withTestClient, cleanupTestData } from "../../helpers/setup";
import { generateTestEmail, generateTestUsername } from "../../helpers/fixtures";

test.describe("Sign In Flow", () => {
  // Create a test user for signin tests
  const testUser = {
    email: generateTestEmail("signin"),
    username: generateTestUsername("si"),
    password: "TestPassword123!",
  };

  test.beforeAll(async ({ browser }) => {
    // Clean up any previous test data
    await withTestClient(async (client) => {
      await cleanupTestData(client);
    });

    // Create user via signup
    const page = await browser.newPage();
    await page.goto("/signup");

    await page.fill("#email", testUser.email);
    await page.fill("#username", testUser.username);
    await page.fill("#password", testUser.password);
    await page.fill("#confirmPassword", testUser.password);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL("/app/todos", { timeout: 15000 });

    // Sign out to prepare for signin tests
    await page.context().clearCookies();
    await page.close();
  });

  test.describe("Form Display", () => {
    test("should display signin form with all fields", async ({ page }) => {
      await page.goto("/signin");

      await expect(page.locator("text=Welcome back")).toBeVisible();
      await expect(page.locator("#identifier")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("button[type='submit']")).toBeVisible();
    });

    test("should have link to password reset", async ({ page }) => {
      await page.goto("/signin");
      await page.click("text=Forgot password?");
      await expect(page).toHaveURL("/reset-password");
    });

    test("should have link to signup", async ({ page }) => {
      await page.goto("/signin");
      await page.click("text=Sign up");
      await expect(page).toHaveURL("/signup");
    });

    test("should have link back to homepage", async ({ page }) => {
      await page.goto("/signin");
      await page.click("text=Todo App");
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("Validation Errors", () => {
    test("should show error for empty fields", async ({ page }) => {
      await page.goto("/signin");
      await page.click("button[type='submit']");

      await expect(
        page.locator("text=Please fill in all fields")
      ).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/signin");

      await page.fill("#identifier", "nonexistent@example.com");
      await page.fill("#password", "WrongPassword123!");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Invalid credentials")).toBeVisible({
        timeout: 10000,
      });
    });

    test("should show error for wrong password", async ({ page }) => {
      await page.goto("/signin");

      await page.fill("#identifier", testUser.email);
      await page.fill("#password", "WrongPassword456!");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Invalid credentials")).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("Successful Sign In", () => {
    test("should signin with email and redirect to app", async ({ page }) => {
      await page.goto("/signin");

      await page.fill("#identifier", testUser.email);
      await page.fill("#password", testUser.password);
      await page.click("button[type='submit']");

      // Should redirect to todos page
      await expect(page).toHaveURL("/app/todos", { timeout: 15000 });
    });

    test("should signin with username and redirect to app", async ({
      page,
    }) => {
      await page.goto("/signin");

      await page.fill("#identifier", testUser.username);
      await page.fill("#password", testUser.password);
      await page.click("button[type='submit']");

      // Should redirect to todos page
      await expect(page).toHaveURL("/app/todos", { timeout: 15000 });
    });

    test("should set session cookie after signin", async ({ page, context }) => {
      // Clear any existing cookies
      await context.clearCookies();

      await page.goto("/signin");

      await page.fill("#identifier", testUser.email);
      await page.fill("#password", testUser.password);
      await page.click("button[type='submit']");

      // Wait for redirect
      await expect(page).toHaveURL("/app/todos", { timeout: 15000 });

      // Verify session cookie is set
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(
        (cookie) => cookie.name === "session_token"
      );
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.value).toBeTruthy();
    });

    test("should persist session across page reload", async ({
      page,
      context,
    }) => {
      // Clear any existing cookies
      await context.clearCookies();

      await page.goto("/signin");

      await page.fill("#identifier", testUser.email);
      await page.fill("#password", testUser.password);
      await page.click("button[type='submit']");

      // Wait for redirect
      await expect(page).toHaveURL("/app/todos", { timeout: 15000 });

      // Reload the page
      await page.reload();

      // Should still be on app page (session persisted)
      await expect(page).toHaveURL("/app/todos", { timeout: 10000 });

      // Should see user menu (indicating logged in)
      await expect(page.locator("text=Todo App")).toBeVisible();
    });
  });

  test.describe("Navigation from Landing Page", () => {
    test("should navigate to signin from Sign In link", async ({ page }) => {
      await page.goto("/");
      await page.click("text=Sign In");
      await expect(page).toHaveURL("/signin");
    });
  });
});
