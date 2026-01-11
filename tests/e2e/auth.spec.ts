import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.describe("Landing Page", () => {
    test("should display landing page with sign in/up links", async ({ page }) => {
      await page.goto("/");

      await expect(page.locator("text=Todo App")).toBeVisible();
      await expect(page.locator("text=Organize Your Tasks")).toBeVisible();
      await expect(page.locator("text=Sign In")).toBeVisible();
      await expect(page.locator("text=Get Started")).toBeVisible();
    });

    test("should navigate to signin from landing page", async ({ page }) => {
      await page.goto("/");
      await page.click("text=Sign In");
      await expect(page).toHaveURL("/signin");
    });

    test("should navigate to signup from landing page", async ({ page }) => {
      await page.goto("/");
      await page.click("text=Get Started");
      await expect(page).toHaveURL("/signup");
    });
  });

  test.describe("Sign Up Flow", () => {
    const timestamp = Date.now();
    const testUser = {
      email: `test-${timestamp}@example.com`,
      username: `testuser${timestamp}`,
      password: "TestPassword123!",
    };

    test("should display signup form", async ({ page }) => {
      await page.goto("/signup");

      await expect(page.locator("text=Create your account")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#username")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#confirmPassword")).toBeVisible();
    });

    test("should show validation errors for empty form", async ({ page }) => {
      await page.goto("/signup");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Email is required")).toBeVisible();
    });

    test("should show password mismatch error", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", testUser.email);
      await page.fill("#username", testUser.username);
      await page.fill("#password", testUser.password);
      await page.fill("#confirmPassword", "DifferentPassword123!");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Passwords don't match")).toBeVisible();
    });

    test("should successfully signup and redirect to app", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", testUser.email);
      await page.fill("#username", testUser.username);
      await page.fill("#password", testUser.password);
      await page.fill("#confirmPassword", testUser.password);
      await page.click("button[type='submit']");

      // Should redirect to todos page
      await expect(page).toHaveURL("/app/todos", { timeout: 10000 });
    });
  });

  test.describe("Sign In Flow", () => {
    test("should display signin form", async ({ page }) => {
      await page.goto("/signin");

      await expect(page.locator("text=Welcome back")).toBeVisible();
      await expect(page.locator("#identifier")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/signin");

      await page.fill("#identifier", "nonexistent@example.com");
      await page.fill("#password", "WrongPassword123!");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Invalid credentials")).toBeVisible({ timeout: 10000 });
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
  });

  test.describe("Password Reset Flow", () => {
    test("should display password reset request form", async ({ page }) => {
      await page.goto("/reset-password");

      await expect(page.locator("text=Reset your password")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
    });

    test("should show success message after reset request", async ({ page }) => {
      await page.goto("/reset-password");

      await page.fill("#email", "any@example.com");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Check your email")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to signin when accessing protected route without auth", async ({ page }) => {
      // Clear any existing cookies
      await page.context().clearCookies();

      await page.goto("/app/todos");

      // Should be redirected to signin
      await expect(page).toHaveURL("/signin", { timeout: 10000 });
    });
  });
});
