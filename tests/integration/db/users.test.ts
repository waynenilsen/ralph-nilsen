/**
 * Integration tests for user database operations.
 *
 * Tests CRUD operations and user-tenant relationships.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestUser,
  createTestTenant,
  createTestUserTenant,
  generateTestEmail,
  generateTestUsername,
} from "../../helpers";

describe("User Database Operations", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  describe("Create User", () => {
    it("should create a user with required fields", async () => {
      await withTestClient(async (client) => {
        const email = generateTestEmail();
        const username = generateTestUsername();

        const result = await createTestUser(client, email, username);

        expect(result.userId).toBeDefined();
        expect(result.email).toBe(email);
        expect(result.username).toBe(username);

        const { rows } = await client.query("SELECT * FROM users WHERE id = $1", [result.userId]);

        expect(rows).toHaveLength(1);
        expect(rows[0].email).toBe(email);
        expect(rows[0].username).toBe(username);
        expect(rows[0].password_hash).toBeDefined();
        expect(rows[0].email_verified).toBe(false);
        expect(rows[0].created_at).toBeInstanceOf(Date);
        expect(rows[0].updated_at).toBeInstanceOf(Date);
      });
    });

    it("should auto-generate UUID id", async () => {
      await withTestClient(async (client) => {
        const result = await createTestUser(client);

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(result.userId).toMatch(uuidRegex);
      });
    });

    it("should enforce unique email constraint", async () => {
      await withTestClient(async (client) => {
        const email = generateTestEmail();
        await createTestUser(client, email, generateTestUsername());

        await expect(createTestUser(client, email, generateTestUsername())).rejects.toThrow();
      });
    });

    it("should enforce unique username constraint", async () => {
      await withTestClient(async (client) => {
        const username = generateTestUsername();
        await createTestUser(client, generateTestEmail(), username);

        await expect(createTestUser(client, generateTestEmail(), username)).rejects.toThrow();
      });
    });

    it("should validate username format", async () => {
      await withTestClient(async (client) => {
        // Username too short (less than 3 characters)
        await expect(
          client.query("INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)", [
            "test-short@test.com",
            "ab",
            "hash",
          ])
        ).rejects.toThrow();

        // Username with invalid characters
        await expect(
          client.query("INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)", [
            "test-invalid@test.com",
            "user@name!",
            "hash",
          ])
        ).rejects.toThrow();
      });
    });

    it("should accept valid username formats", async () => {
      await withTestClient(async (client) => {
        // Alphanumeric
        const result1 = await createTestUser(client, generateTestEmail(), `test${Date.now()}abc`);
        expect(result1.userId).toBeDefined();

        // With underscores
        const result2 = await createTestUser(
          client,
          generateTestEmail(),
          `test_user_${Date.now()}`
        );
        expect(result2.userId).toBeDefined();

        // With dashes
        const result3 = await createTestUser(
          client,
          generateTestEmail(),
          `test-user-${Date.now()}`
        );
        expect(result3.userId).toBeDefined();
      });
    });

    it("should hash password", async () => {
      await withTestClient(async (client) => {
        const result = await createTestUser(client);

        const { rows } = await client.query("SELECT password_hash FROM users WHERE id = $1", [
          result.userId,
        ]);

        // Password hash should not be the plaintext password
        expect(rows[0].password_hash).not.toBe("testpassword123");
        // bcrypt hashes start with $2a$ or $2b$
        expect(rows[0].password_hash).toMatch(/^\$2[ab]\$/);
      });
    });
  });

  describe("Find User by Email", () => {
    it("should find user by email", async () => {
      await withTestClient(async (client) => {
        const email = generateTestEmail();
        const { userId } = await createTestUser(client, email);

        const { rows } = await client.query(
          "SELECT id, email, username FROM users WHERE email = $1",
          [email]
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(userId);
        expect(rows[0].email).toBe(email);
      });
    });

    it("should be case-sensitive for email lookup", async () => {
      await withTestClient(async (client) => {
        const email = `Test-Email-${Date.now()}@Test.com`;
        await createTestUser(client, email);

        const { rows: exact } = await client.query("SELECT id FROM users WHERE email = $1", [
          email,
        ]);
        expect(exact).toHaveLength(1);

        const { rows: lowercase } = await client.query("SELECT id FROM users WHERE email = $1", [
          email.toLowerCase(),
        ]);
        expect(lowercase).toHaveLength(0);
      });
    });

    it("should return empty for non-existent email", async () => {
      await withTestClient(async (client) => {
        const { rows } = await client.query("SELECT * FROM users WHERE email = $1", [
          "nonexistent@test.com",
        ]);

        expect(rows).toHaveLength(0);
      });
    });
  });

  describe("Find User by Username", () => {
    it("should find user by username", async () => {
      await withTestClient(async (client) => {
        const username = generateTestUsername();
        const { userId } = await createTestUser(client, generateTestEmail(), username);

        const { rows } = await client.query("SELECT id, username FROM users WHERE username = $1", [
          username,
        ]);

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(userId);
        expect(rows[0].username).toBe(username);
      });
    });

    it("should return empty for non-existent username", async () => {
      await withTestClient(async (client) => {
        const { rows } = await client.query("SELECT * FROM users WHERE username = $1", [
          "nonexistentuser",
        ]);

        expect(rows).toHaveLength(0);
      });
    });
  });

  describe("Find User by Email or Username", () => {
    it("should find user by email", async () => {
      await withTestClient(async (client) => {
        const email = generateTestEmail();
        const username = generateTestUsername();
        const { userId } = await createTestUser(client, email, username);

        const { rows } = await client.query(
          "SELECT id FROM users WHERE email = $1 OR username = $1",
          [email]
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(userId);
      });
    });

    it("should find user by username", async () => {
      await withTestClient(async (client) => {
        const email = generateTestEmail();
        const username = generateTestUsername();
        const { userId } = await createTestUser(client, email, username);

        const { rows } = await client.query(
          "SELECT id FROM users WHERE email = $1 OR username = $1",
          [username]
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(userId);
      });
    });
  });

  describe("Update User", () => {
    it("should update user email", async () => {
      await withTestClient(async (client) => {
        const { userId } = await createTestUser(client);
        const newEmail = generateTestEmail("updated");

        await client.query("UPDATE users SET email = $1 WHERE id = $2", [newEmail, userId]);

        const { rows } = await client.query("SELECT email FROM users WHERE id = $1", [userId]);

        expect(rows[0].email).toBe(newEmail);
      });
    });

    it("should update user email_verified status", async () => {
      await withTestClient(async (client) => {
        const { userId } = await createTestUser(client);

        await client.query("UPDATE users SET email_verified = $1 WHERE id = $2", [true, userId]);

        const { rows } = await client.query("SELECT email_verified FROM users WHERE id = $1", [
          userId,
        ]);

        expect(rows[0].email_verified).toBe(true);
      });
    });

    it("should auto-update updated_at on update", async () => {
      await withTestClient(async (client) => {
        const { userId } = await createTestUser(client);

        const { rows: before } = await client.query("SELECT updated_at FROM users WHERE id = $1", [
          userId,
        ]);

        // Small delay to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        await client.query("UPDATE users SET email_verified = $1 WHERE id = $2", [true, userId]);

        const { rows: after } = await client.query("SELECT updated_at FROM users WHERE id = $1", [
          userId,
        ]);

        expect(after[0].updated_at.getTime()).toBeGreaterThan(before[0].updated_at.getTime());
      });
    });
  });

  describe("User-Tenant Relationships", () => {
    it("should create user-tenant relationship", async () => {
      await withTestClient(async (client) => {
        const { userId } = await createTestUser(client);
        const tenantId = await createTestTenant(client, `test-user-tenant-${Date.now()}`);

        await createTestUserTenant(client, userId, tenantId, "owner");

        const { rows } = await client.query(
          "SELECT * FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
          [userId, tenantId]
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].role).toBe("owner");
      });
    });

    it("should support multiple roles: owner, member, admin", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-roles-${Date.now()}`);

        const roles = ["owner", "member", "admin"];
        for (const role of roles) {
          const { userId } = await createTestUser(client);
          await createTestUserTenant(client, userId, tenantId, role);

          const { rows } = await client.query(
            "SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
            [userId, tenantId]
          );

          expect(rows[0].role).toBe(role);
        }
      });
    });

    it("should enforce unique user-tenant combination", async () => {
      await withTestClient(async (client) => {
        const { userId } = await createTestUser(client);
        const tenantId = await createTestTenant(client, `test-unique-ut-${Date.now()}`);

        await createTestUserTenant(client, userId, tenantId);

        await expect(createTestUserTenant(client, userId, tenantId)).rejects.toThrow();
      });
    });

    it("should cascade delete user_tenants when user is deleted", async () => {
      await withTestClient(async (client) => {
        const { userId } = await createTestUser(client);
        const tenantId = await createTestTenant(client, `test-cascade-${Date.now()}`);

        await createTestUserTenant(client, userId, tenantId);

        // Verify relationship exists
        const { rows: before } = await client.query(
          "SELECT * FROM user_tenants WHERE user_id = $1",
          [userId]
        );
        expect(before).toHaveLength(1);

        // Delete user
        await client.query("DELETE FROM users WHERE id = $1", [userId]);

        // Verify relationship is also deleted
        const { rows: after } = await client.query(
          "SELECT * FROM user_tenants WHERE user_id = $1",
          [userId]
        );
        expect(after).toHaveLength(0);
      });
    });

    it("should cascade delete user_tenants when tenant is deleted", async () => {
      await withTestClient(async (client) => {
        const { userId } = await createTestUser(client);
        const tenantId = await createTestTenant(client, `test-cascade-tenant-${Date.now()}`);

        await createTestUserTenant(client, userId, tenantId);

        // Verify relationship exists
        const { rows: before } = await client.query(
          "SELECT * FROM user_tenants WHERE tenant_id = $1",
          [tenantId]
        );
        expect(before).toHaveLength(1);

        // Delete tenant
        await client.query("DELETE FROM tenants WHERE id = $1", [tenantId]);

        // Verify relationship is also deleted
        const { rows: after } = await client.query(
          "SELECT * FROM user_tenants WHERE tenant_id = $1",
          [tenantId]
        );
        expect(after).toHaveLength(0);
      });
    });

    it("should allow user to belong to multiple tenants", async () => {
      await withTestClient(async (client) => {
        const { userId } = await createTestUser(client);
        const tenant1Id = await createTestTenant(client, `test-multi-1-${Date.now()}`);
        const tenant2Id = await createTestTenant(client, `test-multi-2-${Date.now()}`);

        await createTestUserTenant(client, userId, tenant1Id, "owner");
        await createTestUserTenant(client, userId, tenant2Id, "member");

        const { rows } = await client.query(
          "SELECT tenant_id, role FROM user_tenants WHERE user_id = $1 ORDER BY role",
          [userId]
        );

        expect(rows).toHaveLength(2);
        expect(rows.map((r) => r.role).sort()).toEqual(["member", "owner"]);
      });
    });

    it("should allow tenant to have multiple users", async () => {
      await withTestClient(async (client) => {
        const tenantId = await createTestTenant(client, `test-multi-users-${Date.now()}`);

        const user1 = await createTestUser(client);
        const user2 = await createTestUser(client);
        const user3 = await createTestUser(client);

        await createTestUserTenant(client, user1.userId, tenantId, "owner");
        await createTestUserTenant(client, user2.userId, tenantId, "admin");
        await createTestUserTenant(client, user3.userId, tenantId, "member");

        const { rows } = await client.query(
          "SELECT user_id FROM user_tenants WHERE tenant_id = $1",
          [tenantId]
        );

        expect(rows).toHaveLength(3);
      });
    });
  });
});
