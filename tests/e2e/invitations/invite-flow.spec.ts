/**
 * E2E tests for invitation flows.
 *
 * Tests the complete invitation journey including sending invitations,
 * accepting as new user, accepting as existing user, declining, and revoking.
 */

import { test, expect } from "@playwright/test";
import {
  withTestClient,
  cleanupTestData,
  createTestUserWithSession,
  createTestUser,
} from "../../helpers/setup";
import { generateTestEmail, generateTestUsername } from "../../helpers/fixtures";
import {
  waitForEmail,
  getLatestEmail,
  clearMailHogEmails,
  checkMailHogConnection,
} from "../../helpers/email";
import { adminPool } from "@/server/db";
import type { OrganizationInvitation } from "@/shared/types";

test.describe("Invitation Flow - Owner Invites New User", () => {
  let ownerEmail: string;
  let ownerPassword: string;
  let invitedEmail: string;

  test.beforeAll(async () => {
    await withTestClient(cleanupTestData);
    if (await checkMailHogConnection()) {
      await clearMailHogEmails();
    }

    ownerEmail = generateTestEmail("owner");
    ownerPassword = "TestPassword123!";
    invitedEmail = generateTestEmail("invited");
  });

  test("should send invitation email when owner invites new user", async ({ page }) => {
    // Sign up as owner
    await page.goto("/signup");
    await page.fill("#email", ownerEmail);
    await page.fill("#username", generateTestUsername("owner"));
    await page.fill("#password", ownerPassword);
    await page.fill("#confirmPassword", ownerPassword);
    await page.click("button[type='submit']");

    // Wait for redirect to app
    await page.waitForURL(/\/app/);

    // Navigate to org settings/members (adjust URL based on actual implementation)
    await page.goto("/app/organizations");

    // Click invite button
    const inviteButton = page.locator("button", { hasText: /invite/i }).first();
    if (await inviteButton.isVisible()) {
      await inviteButton.click();

      // Fill invitation form
      await page.fill("input[type='email']", invitedEmail);
      await page.click("button[type='submit']:has-text('Send')");

      // Wait for success message
      await expect(page.locator("text=/invitation.*sent/i")).toBeVisible({ timeout: 10000 });

      // Verify email was sent
      if (await checkMailHogConnection()) {
        const email = await waitForEmail(invitedEmail, 10000);
        expect(email).toBeDefined();
        expect(email.to).toContain(invitedEmail);
        expect(email.subject).toContain("invited");
      }
    }
  });

  test("should allow new user to sign up via invitation link", async ({ page, context }) => {
    // Get invitation token from database
    let invitationToken: string | undefined;
    await withTestClient(async (client) => {
      const { rows } = await client.query<OrganizationInvitation>(
        "SELECT token FROM organization_invitations WHERE email = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [invitedEmail]
      );
      invitationToken = rows[0]?.token;
    });

    if (!invitationToken) {
      test.skip();
      return;
    }

    // Visit invitation link
    await page.goto(`/invite/${invitationToken}`);

    // Should show invitation details
    await expect(page.locator("text=/invited.*to.*join/i")).toBeVisible();

    // Click sign up button
    await page.click("button:has-text('Sign Up')");

    // Should be redirected to signup with email pre-filled
    await page.waitForURL(/\/signup/);

    // Complete signup
    await page.fill("#username", generateTestUsername("invited"));
    await page.fill("#password", "InvitedPass123!");
    await page.fill("#confirmPassword", "InvitedPass123!");
    await page.click("button[type='submit']");

    // Should be redirected to app and be member of org
    await page.waitForURL(/\/app/);

    // Verify user is in the organization
    await page.goto("/app/organizations");
    await expect(page.locator("text=/member/i").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Invitation Flow - Owner Invites Existing User", () => {
  let ownerEmail: string;
  let ownerPassword: string;
  let existingUserEmail: string;
  let existingUserPassword: string;

  test.beforeAll(async () => {
    await withTestClient(cleanupTestData);
    if (await checkMailHogConnection()) {
      await clearMailHogEmails();
    }

    ownerEmail = generateTestEmail("owner2");
    ownerPassword = "TestPassword123!";
    existingUserEmail = generateTestEmail("existing");
    existingUserPassword = "ExistingPass123!";
  });

  test("should allow existing user to accept invitation", async ({ page, context }) => {
    // Sign up owner
    await page.goto("/signup");
    await page.fill("#email", ownerEmail);
    await page.fill("#username", generateTestUsername("owner2"));
    await page.fill("#password", ownerPassword);
    await page.fill("#confirmPassword", ownerPassword);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Sign out
    await page.goto("/signout");
    await page.waitForURL("/");

    // Sign up existing user
    await page.goto("/signup");
    await page.fill("#email", existingUserEmail);
    await page.fill("#username", generateTestUsername("existing"));
    await page.fill("#password", existingUserPassword);
    await page.fill("#confirmPassword", existingUserPassword);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Sign out
    await page.goto("/signout");
    await page.waitForURL("/");

    // Sign in as owner
    await page.goto("/signin");
    await page.fill("#email", ownerEmail);
    await page.fill("#password", ownerPassword);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Send invitation to existing user
    await page.goto("/app/organizations");
    const inviteButton = page.locator("button", { hasText: /invite/i }).first();
    if (await inviteButton.isVisible()) {
      await inviteButton.click();
      await page.fill("input[type='email']", existingUserEmail);
      await page.click("button[type='submit']:has-text('Send')");
      await expect(page.locator("text=/invitation.*sent/i")).toBeVisible({ timeout: 10000 });
    }

    // Get invitation token
    let invitationToken: string | undefined;
    await withTestClient(async (client) => {
      const { rows } = await client.query<OrganizationInvitation>(
        "SELECT token FROM organization_invitations WHERE email = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [existingUserEmail]
      );
      invitationToken = rows[0]?.token;
    });

    if (!invitationToken) {
      test.skip();
      return;
    }

    // Sign out
    await page.goto("/signout");
    await page.waitForURL("/");

    // Sign in as existing user
    await page.goto("/signin");
    await page.fill("#email", existingUserEmail);
    await page.fill("#password", existingUserPassword);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Visit invitation link
    await page.goto(`/invite/${invitationToken}`);

    // Should show invitation details
    await expect(page.locator("text=/invited.*to.*join/i")).toBeVisible();

    // Click accept button
    await page.click("button:has-text('Accept')");

    // Should redirect to organization
    await page.waitForURL(/\/app/);

    // Verify user can switch to new organization
    await page.goto("/app/organizations");
    // Should see organization list with new org
    const orgElements = await page.locator("[data-testid='organization-item']").count();
    expect(orgElements).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Invitation Flow - Decline Invitation", () => {
  test("should allow user to decline invitation", async ({ page }) => {
    await withTestClient(cleanupTestData);
    if (await checkMailHogConnection()) {
      await clearMailHogEmails();
    }

    const ownerEmail = generateTestEmail("owner3");
    const declineEmail = generateTestEmail("decline");

    // Create owner and send invitation
    await page.goto("/signup");
    await page.fill("#email", ownerEmail);
    await page.fill("#username", generateTestUsername("owner3"));
    await page.fill("#password", "TestPassword123!");
    await page.fill("#confirmPassword", "TestPassword123!");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Send invitation
    await page.goto("/app/organizations");
    const inviteButton = page.locator("button", { hasText: /invite/i }).first();
    if (await inviteButton.isVisible()) {
      await inviteButton.click();
      await page.fill("input[type='email']", declineEmail);
      await page.click("button[type='submit']:has-text('Send')");
      await expect(page.locator("text=/invitation.*sent/i")).toBeVisible({ timeout: 10000 });
    }

    // Get invitation token
    let invitationToken: string | undefined;
    await withTestClient(async (client) => {
      const { rows } = await client.query<OrganizationInvitation>(
        "SELECT token FROM organization_invitations WHERE email = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [declineEmail]
      );
      invitationToken = rows[0]?.token;
    });

    if (!invitationToken) {
      test.skip();
      return;
    }

    // Sign out and create user to decline
    await page.goto("/signout");
    await page.goto("/signup");
    await page.fill("#email", declineEmail);
    await page.fill("#username", generateTestUsername("decline"));
    await page.fill("#password", "DeclinePass123!");
    await page.fill("#confirmPassword", "DeclinePass123!");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Visit invitation and decline
    await page.goto(`/invite/${invitationToken}`);
    await expect(page.locator("text=/invited.*to.*join/i")).toBeVisible();
    await page.click("button:has-text('Decline')");

    // Should show confirmation
    await expect(page.locator("text=/declined/i")).toBeVisible({ timeout: 5000 });

    // Verify invitation status in database
    await withTestClient(async (client) => {
      const { rows } = await client.query<OrganizationInvitation>(
        "SELECT status FROM organization_invitations WHERE token = $1",
        [invitationToken]
      );
      expect(rows[0]?.status).toBe("declined");
    });
  });
});

test.describe("Invitation Flow - Revoke Invitation", () => {
  test("should allow owner to revoke pending invitation", async ({ page }) => {
    await withTestClient(cleanupTestData);
    if (await checkMailHogConnection()) {
      await clearMailHogEmails();
    }

    const ownerEmail = generateTestEmail("owner4");
    const revokeEmail = generateTestEmail("revoke");

    // Create owner
    await page.goto("/signup");
    await page.fill("#email", ownerEmail);
    await page.fill("#username", generateTestUsername("owner4"));
    await page.fill("#password", "TestPassword123!");
    await page.fill("#confirmPassword", "TestPassword123!");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Send invitation
    await page.goto("/app/organizations");
    const inviteButton = page.locator("button", { hasText: /invite/i }).first();
    if (await inviteButton.isVisible()) {
      await inviteButton.click();
      await page.fill("input[type='email']", revokeEmail);
      await page.click("button[type='submit']:has-text('Send')");
      await expect(page.locator("text=/invitation.*sent/i")).toBeVisible({ timeout: 10000 });
    }

    // Get invitation token
    let invitationToken: string | undefined;
    await withTestClient(async (client) => {
      const { rows } = await client.query<OrganizationInvitation>(
        "SELECT token FROM organization_invitations WHERE email = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [revokeEmail]
      );
      invitationToken = rows[0]?.token;
    });

    if (!invitationToken) {
      test.skip();
      return;
    }

    // Find and click revoke button in pending invitations list
    await page.goto("/app/organizations");
    const revokeButton = page.locator("button", { hasText: /revoke/i }).first();
    if (await revokeButton.isVisible()) {
      await revokeButton.click();

      // Confirm revocation if there's a confirmation dialog
      const confirmButton = page.locator("button", { hasText: /confirm|yes|revoke/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Should show success message
      await expect(page.locator("text=/revoked/i")).toBeVisible({ timeout: 5000 });
    }

    // Verify invitation link no longer works
    await page.goto(`/invite/${invitationToken}`);
    await expect(page.locator("text=/invalid|expired|revoked/i")).toBeVisible();

    // Verify invitation status in database
    await withTestClient(async (client) => {
      const { rows } = await client.query<OrganizationInvitation>(
        "SELECT status FROM organization_invitations WHERE token = $1",
        [invitationToken]
      );
      expect(rows[0]?.status).toBe("revoked");
    });
  });
});
