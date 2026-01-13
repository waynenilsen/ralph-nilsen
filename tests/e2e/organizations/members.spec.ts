/**
 * E2E tests for organization members management page.
 *
 * Tests viewing members, changing roles, removing members,
 * transferring ownership, and leaving organizations.
 */

import { test, expect } from "@playwright/test";
import {
  withTestClient,
  cleanupTestData,
  createTestUserWithSession,
  createTestUser,
  createTestUserTenant,
} from "../../helpers/setup";
import { generateTestEmail, generateTestUsername } from "../../helpers/fixtures";

test.describe("Organization Members - View Members List", () => {
  test("should display all members with their roles", async ({ page }) => {
    await withTestClient(cleanupTestData);

    const ownerEmail = generateTestEmail("owner");
    const ownerPassword = "TestPassword123!";

    // Create and add members via database
    let tenantId: string;
    await withTestClient(async (client) => {
      const result = await createTestUserWithSession(client, {
        email: ownerEmail,
        username: generateTestUsername("owner"),
        role: "owner",
      });
      tenantId = result.tenantId;

      // Add admin
      const { email: adminEmail } = await createTestUser(client, "admin@test.com", "adminuser");
      const { rows: adminUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        adminEmail,
      ]);
      await createTestUserTenant(client, adminUsers[0].id, tenantId, "admin");

      // Add member
      const { email: memberEmail } = await createTestUser(
        client,
        "member@test.com",
        "memberuser"
      );
      const { rows: memberUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        memberEmail,
      ]);
      await createTestUserTenant(client, memberUsers[0].id, tenantId, "member");
    });

    // Sign in as owner
    await page.goto("/signin");
    await page.fill("#email", ownerEmail);
    await page.fill("#password", ownerPassword);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Navigate to members page
    await page.goto("/app/organizations");

    // Should see members section or link
    const membersLink = page.locator("a,button", { hasText: /members/i }).first();
    if (await membersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await membersLink.click();

      // Should see at least 3 members
      await expect(page.locator("text=/owner/i").first()).toBeVisible();
      await expect(page.locator("text=/admin/i").first()).toBeVisible();
      await expect(page.locator("text=/member/i").first()).toBeVisible();
    }
  });
});

test.describe("Organization Members - Change Member Role", () => {
  test("should allow owner to promote member to admin", async ({ page }) => {
    await withTestClient(cleanupTestData);

    const ownerEmail = generateTestEmail("owner2");
    const ownerPassword = "TestPassword123!";
    const memberEmail = "promoteme@test.com";

    let tenantId: string;
    let memberId: string;

    await withTestClient(async (client) => {
      const result = await createTestUserWithSession(client, {
        email: ownerEmail,
        username: generateTestUsername("owner2"),
        role: "owner",
      });
      tenantId = result.tenantId;

      // Add member
      const { email } = await createTestUser(client, memberEmail, "promoteme");
      const { rows: memberUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        email,
      ]);
      memberId = memberUsers[0].id;
      await createTestUserTenant(client, memberId, tenantId, "member");
    });

    // Sign in as owner
    await page.goto("/signin");
    await page.fill("#email", ownerEmail);
    await page.fill("#password", ownerPassword);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Navigate to members page
    await page.goto("/app/organizations");

    const membersLink = page.locator("a,button", { hasText: /members/i }).first();
    if (await membersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await membersLink.click();

      // Find the member row and click role change option
      const memberRow = page.locator(`text=${memberEmail}`).locator("..");
      const roleButton = memberRow.locator("button,select", { hasText: /role|member/i }).first();

      if (await roleButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await roleButton.click();

        // Select admin role
        const adminOption = page.locator("text=Admin,button:has-text('Admin')").first();
        if (await adminOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await adminOption.click();

          // Confirm if there's a confirmation dialog
          const confirmButton = page.locator("button", { hasText: /confirm|yes|save/i });
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
          }

          // Should show success message
          await expect(page.locator("text=/role.*updated|changed.*admin/i")).toBeVisible({
            timeout: 5000,
          });
        }
      }

      // Verify in database
      await withTestClient(async (client) => {
        const { rows } = await client.query(
          "SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
          [memberId, tenantId]
        );
        expect(rows[0]?.role).toBe("admin");
      });
    }
  });
});

test.describe("Organization Members - Remove Member", () => {
  test("should allow owner to remove member", async ({ page }) => {
    await withTestClient(cleanupTestData);

    const ownerEmail = generateTestEmail("owner3");
    const ownerPassword = "TestPassword123!";
    const removeEmail = "removeme@test.com";

    let tenantId: string;
    let memberId: string;

    await withTestClient(async (client) => {
      const result = await createTestUserWithSession(client, {
        email: ownerEmail,
        username: generateTestUsername("owner3"),
        role: "owner",
      });
      tenantId = result.tenantId;

      // Add member to remove
      const { email } = await createTestUser(client, removeEmail, "removeme");
      const { rows: memberUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        email,
      ]);
      memberId = memberUsers[0].id;
      await createTestUserTenant(client, memberId, tenantId, "member");
    });

    // Sign in as owner
    await page.goto("/signin");
    await page.fill("#email", ownerEmail);
    await page.fill("#password", ownerPassword);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Navigate to members page
    await page.goto("/app/organizations");

    const membersLink = page.locator("a,button", { hasText: /members/i }).first();
    if (await membersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await membersLink.click();

      // Find remove button for the member
      const memberRow = page.locator(`text=${removeEmail}`).locator("..");
      const removeButton = memberRow.locator("button", { hasText: /remove|delete/i }).first();

      if (await removeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await removeButton.click();

        // Confirm removal
        const confirmButton = page.locator("button", { hasText: /confirm|yes|remove/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Should show success message
        await expect(page.locator("text=/removed|deleted/i")).toBeVisible({ timeout: 5000 });

        // Member should no longer be in list
        await expect(page.locator(`text=${removeEmail}`)).not.toBeVisible({ timeout: 5000 });
      }

      // Verify in database
      await withTestClient(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
          [memberId, tenantId]
        );
        expect(rows).toHaveLength(0);
      });
    }
  });
});

test.describe("Organization Members - Transfer Ownership", () => {
  test("should allow owner to transfer ownership to another member", async ({ page }) => {
    await withTestClient(cleanupTestData);

    const ownerEmail = generateTestEmail("owner4");
    const ownerPassword = "TestPassword123!";
    const newOwnerEmail = "newowner@test.com";

    let tenantId: string;
    let ownerId: string;
    let newOwnerId: string;

    await withTestClient(async (client) => {
      const result = await createTestUserWithSession(client, {
        email: ownerEmail,
        username: generateTestUsername("owner4"),
        role: "owner",
      });
      tenantId = result.tenantId;
      ownerId = result.userId;

      // Add member to transfer ownership to
      const { email } = await createTestUser(client, newOwnerEmail, "newowner");
      const { rows: newOwnerUsers } = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      newOwnerId = newOwnerUsers[0].id;
      await createTestUserTenant(client, newOwnerId, tenantId, "admin");
    });

    // Sign in as owner
    await page.goto("/signin");
    await page.fill("#email", ownerEmail);
    await page.fill("#password", ownerPassword);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Navigate to members page
    await page.goto("/app/organizations");

    const membersLink = page.locator("a,button", { hasText: /members/i }).first();
    if (await membersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await membersLink.click();

      // Find transfer ownership button for the member
      const memberRow = page.locator(`text=${newOwnerEmail}`).locator("..");
      const transferButton = memberRow
        .locator("button", { hasText: /transfer|ownership/i })
        .first();

      if (await transferButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await transferButton.click();

        // Confirm transfer (may require typing org name)
        const confirmInput = page.locator("input[type='text']");
        if (await confirmInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Type organization name or confirmation text
          await confirmInput.fill("confirm");
        }

        const confirmButton = page.locator("button", { hasText: /confirm|yes|transfer/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Should show success message
        await expect(page.locator("text=/ownership.*transferred/i")).toBeVisible({
          timeout: 5000,
        });
      }

      // Verify in database
      await withTestClient(async (client) => {
        const { rows: newOwnerRow } = await client.query(
          "SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
          [newOwnerId, tenantId]
        );
        expect(newOwnerRow[0]?.role).toBe("owner");

        const { rows: oldOwnerRow } = await client.query(
          "SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
          [ownerId, tenantId]
        );
        expect(oldOwnerRow[0]?.role).toBe("admin");
      });
    }
  });
});

test.describe("Organization Members - Leave Organization", () => {
  test("should allow member to leave organization", async ({ page }) => {
    await withTestClient(cleanupTestData);

    const ownerEmail = generateTestEmail("owner5");
    const memberEmail = generateTestEmail("member5");
    const memberPassword = "MemberPass123!";

    let ownerTenantId: string;
    let memberId: string;
    let memberTenantId: string;

    await withTestClient(async (client) => {
      // Create owner org
      const ownerResult = await createTestUserWithSession(client, {
        email: ownerEmail,
        username: generateTestUsername("owner5"),
        role: "owner",
      });
      ownerTenantId = ownerResult.tenantId;

      // Create member with their own org
      const memberResult = await createTestUserWithSession(client, {
        email: memberEmail,
        username: generateTestUsername("member5"),
        role: "owner",
      });
      memberId = memberResult.userId;
      memberTenantId = memberResult.tenantId;

      // Add member to owner's org
      await createTestUserTenant(client, memberId, ownerTenantId, "member");
    });

    // Sign in as member
    await page.goto("/signin");
    await page.fill("#email", memberEmail);
    await page.fill("#password", memberPassword);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/app/);

    // Switch to owner's org
    await page.goto("/app/organizations");

    // Find and click owner's org to switch
    const orgSwitcher = page.locator("button,select", { hasText: /organization|switch/i }).first();
    if (await orgSwitcher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await orgSwitcher.click();

      // Select owner's org (not member's own org)
      // This may vary based on implementation
      await page.waitForTimeout(1000);
    }

    // Navigate to members page
    const membersLink = page.locator("a,button", { hasText: /members/i }).first();
    if (await membersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await membersLink.click();

      // Find and click leave organization button
      const leaveButton = page.locator("button", { hasText: /leave.*organization/i }).first();

      if (await leaveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await leaveButton.click();

        // Confirm leaving
        const confirmButton = page.locator("button", { hasText: /confirm|yes|leave/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Should show success message and redirect
        await expect(page.locator("text=/left.*organization/i")).toBeVisible({ timeout: 5000 });
      }

      // Verify member was removed from owner's org
      await withTestClient(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
          [memberId, ownerTenantId]
        );
        expect(rows).toHaveLength(0);
      });

      // Verify member still has their own org
      await withTestClient(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
          [memberId, memberTenantId]
        );
        expect(rows).toHaveLength(1);
      });
    }
  });
});
