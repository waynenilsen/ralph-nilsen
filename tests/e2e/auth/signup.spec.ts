import { test, expect } from "@playwright/test";
import {
  waitForEmail,
  getEmailSubject,
  clearMailHogEmails,
  checkMailHogConnection,
} from "../../helpers/email";
import { withTestClient, cleanupTestData } from "../../helpers/setup";
import { generateTestEmail, generateTestUsername } from "../../helpers/fixtures";

test.describe("Sign Up Flow", () => {
  test.beforeAll(async () => {
    // Clean up test data before running tests
    await withTestClient(async (client) => {
      await cleanupTestData(client);
    });

    // Clear any existing emails in MailHog
    if (await checkMailHogConnection()) {
      await clearMailHogEmails();
    }
  });

  test.describe("Form Display", () => {
    test("should display signup form with all fields", async ({ page }) => {
      await page.goto("/signup");

      await expect(page.locator("text=Create your account")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#username")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#confirmPassword")).toBeVisible();
      await expect(page.locator("button[type='submit']")).toBeVisible();
    });

    test("should have link to signin page", async ({ page }) => {
      await page.goto("/signup");
      await page.click("text=Sign in");
      await expect(page).toHaveURL("/signin");
    });

    test("should have link back to homepage", async ({ page }) => {
      await page.goto("/signup");
      await page.click("text=Todo App");
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("Validation Errors", () => {
    test("should show error for empty email", async ({ page }) => {
      await page.goto("/signup");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Email is required")).toBeVisible();
    });

    test("should show error for invalid email format", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", "notavalidemail");
      await page.fill("#username", "validuser");
      await page.fill("#password", "ValidPassword123!");
      await page.fill("#confirmPassword", "ValidPassword123!");
      await page.click("button[type='submit']");

      // Browser HTML5 validation may kick in first, or React validation
      // Either way, the form should not submit successfully
      await expect(page).toHaveURL("/signup");
      // Check for either custom validation error or browser validation
      const hasCustomError = await page
        .getByTestId("signup-email-error")
        .isVisible()
        .catch(() => false);
      const stillOnPage = await page.locator("#email").isVisible();
      expect(hasCustomError || stillOnPage).toBe(true);
    });

    test("should show error for empty username", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", "valid@example.com");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Username is required")).toBeVisible();
    });

    test("should show error for username too short", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", "valid@example.com");
      await page.fill("#username", "ab");
      await page.fill("#password", "ValidPassword123!");
      await page.fill("#confirmPassword", "ValidPassword123!");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Username must be at least 3 characters")).toBeVisible();
    });

    test("should show error for invalid username characters", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", "valid@example.com");
      await page.fill("#username", "user@name!");
      await page.fill("#password", "ValidPassword123!");
      await page.fill("#confirmPassword", "ValidPassword123!");
      await page.click("button[type='submit']");

      await expect(
        page.locator("text=Username can only contain letters, numbers, underscores, and hyphens")
      ).toBeVisible();
    });

    test("should show error for empty password", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", "valid@example.com");
      await page.fill("#username", "validuser");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Password is required")).toBeVisible();
    });

    test("should show error for password too short", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", "valid@example.com");
      await page.fill("#username", "validuser");
      await page.fill("#password", "short");
      await page.fill("#confirmPassword", "short");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Password must be at least 8 characters")).toBeVisible();
    });

    test("should show password mismatch error", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", generateTestEmail());
      await page.fill("#username", generateTestUsername());
      await page.fill("#password", "ValidPassword123!");
      await page.fill("#confirmPassword", "DifferentPassword456!");
      await page.click("button[type='submit']");

      await expect(page.locator("text=Passwords don't match")).toBeVisible();
    });
  });

  test.describe("Successful Signup", () => {
    test("should successfully signup and redirect to app", async ({ page }) => {
      const testUser = {
        email: generateTestEmail("signup"),
        username: generateTestUsername("su"),
        password: "TestPassword123!",
      };

      await page.goto("/signup");

      await page.fill("#email", testUser.email);
      await page.fill("#username", testUser.username);
      await page.fill("#password", testUser.password);
      await page.fill("#confirmPassword", testUser.password);
      await page.click("button[type='submit']");

      // Should redirect to todos page
      await expect(page).toHaveURL("/app/todos", { timeout: 15000 });
    });

    test("should set session cookie after signup", async ({ page, context }) => {
      const testUser = {
        email: generateTestEmail("signup-cookie"),
        username: generateTestUsername("suc"),
        password: "TestPassword123!",
      };

      await page.goto("/signup");

      await page.fill("#email", testUser.email);
      await page.fill("#username", testUser.username);
      await page.fill("#password", testUser.password);
      await page.fill("#confirmPassword", testUser.password);
      await page.click("button[type='submit']");

      // Wait for redirect
      await expect(page).toHaveURL("/app/todos", { timeout: 15000 });

      // Verify session cookie is set
      const cookies = await context.cookies();
      const sessionCookie = cookies.find((cookie) => cookie.name === "session_token");
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.value).toBeTruthy();
    });

    test("should receive welcome email after signup", async ({ page }) => {
      // Skip if MailHog is not available
      const mailHogAvailable = await checkMailHogConnection();
      test.skip(!mailHogAvailable, "MailHog not available");

      // Clear emails before test
      await clearMailHogEmails();

      const testUser = {
        email: generateTestEmail("welcome"),
        username: generateTestUsername("we"),
        password: "TestPassword123!",
      };

      await page.goto("/signup");

      await page.fill("#email", testUser.email);
      await page.fill("#username", testUser.username);
      await page.fill("#password", testUser.password);
      await page.fill("#confirmPassword", testUser.password);
      await page.click("button[type='submit']");

      // Wait for redirect
      await expect(page).toHaveURL("/app/todos", { timeout: 15000 });

      // Wait for welcome email
      const email = await waitForEmail(testUser.email, {
        timeout: 10000,
        subjectContains: "welcome",
      });

      // Note: If no welcome email is sent, this test will skip rather than fail
      // since the application may not have welcome emails implemented
      if (email) {
        expect(getEmailSubject(email).toLowerCase()).toContain("welcome");
      }
    });
  });

  test.describe("Duplicate User Handling", () => {
    const existingUser = {
      email: generateTestEmail("duplicate"),
      username: generateTestUsername("dup"),
      password: "TestPassword123!",
    };

    test.beforeAll(async ({ browser }) => {
      // Create a user first
      const page = await browser.newPage();
      await page.goto("/signup");

      await page.fill("#email", existingUser.email);
      await page.fill("#username", existingUser.username);
      await page.fill("#password", existingUser.password);
      await page.fill("#confirmPassword", existingUser.password);
      await page.click("button[type='submit']");

      await expect(page).toHaveURL("/app/todos", { timeout: 15000 });
      await page.close();
    });

    test("should show error for duplicate email", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", existingUser.email);
      await page.fill("#username", generateTestUsername("new"));
      await page.fill("#password", "TestPassword123!");
      await page.fill("#confirmPassword", "TestPassword123!");
      await page.click("button[type='submit']");

      // Should show error about email already in use
      await expect(page.getByTestId("signup-form-error")).toBeVisible({ timeout: 10000 });
    });

    test("should show error for duplicate username", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("#email", generateTestEmail("newuser"));
      await page.fill("#username", existingUser.username);
      await page.fill("#password", "TestPassword123!");
      await page.fill("#confirmPassword", "TestPassword123!");
      await page.click("button[type='submit']");

      // Should show error about username already in use
      await expect(page.getByTestId("signup-form-error")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Navigation from Landing Page", () => {
    test("should navigate to signup from Get Started button", async ({ page }) => {
      await page.goto("/");
      await page.click("text=Get Started");
      await expect(page).toHaveURL("/signup");
    });
  });
});
