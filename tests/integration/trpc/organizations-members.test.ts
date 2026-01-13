/**
 * Integration tests for organizations member management endpoints.
 *
 * Tests getMembers, removeMember, updateMemberRole, transferOwnership, and leave.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestUserWithSession,
  createTestUser,
  createTestUserTenant,
} from "../../helpers";
import { createSessionCaller } from "../../helpers/api";

describe("Organizations Router - Get Members", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should return all members with roles", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      // Add additional members
      const { email: member1Email } = await createTestUser(client, "member1@test.com", "member1");
      const { rows: member1Users } = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [member1Email]
      );
      await createTestUserTenant(client, member1Users[0].id, tenantId, "member");

      const { email: admin1Email } = await createTestUser(client, "admin1@test.com", "admin1");
      const { rows: admin1Users } = await client.query("SELECT id FROM users WHERE email = $1", [
        admin1Email,
      ]);
      await createTestUserTenant(client, admin1Users[0].id, tenantId, "admin");

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const members = await caller.organizations.getMembers();

      expect(members).toHaveLength(3);
      expect(members.some((m) => m.role === "owner")).toBe(true);
      expect(members.some((m) => m.role === "admin")).toBe(true);
      expect(members.some((m) => m.role === "member")).toBe(true);
    });
  });

  it("should be accessible by any member", async () => {
    await withTestClient(async (client) => {
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create member user
      const { sessionToken, userId } = await createTestUserWithSession(client);
      await createTestUserTenant(client, userId, tenantId, "member");

      // Update session to point to the target tenant
      await client.query("UPDATE sessions SET tenant_id = $1 WHERE session_token = $2", [
        tenantId,
        sessionToken,
      ]);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const members = await caller.organizations.getMembers();
      expect(members.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("Organizations Router - Remove Member", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should successfully remove member as owner", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      // Add member to remove
      const { email: memberEmail } = await createTestUser(client, "remove@test.com", "removeme");
      const { rows: memberUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        memberEmail,
      ]);
      const memberId = memberUsers[0].id;
      await createTestUserTenant(client, memberId, tenantId, "member");

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.organizations.removeMember({ userId: memberId });
      expect(result.success).toBe(true);

      // Verify member was removed
      const { rows: userTenants } = await client.query(
        "SELECT * FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
        [memberId, tenantId]
      );
      expect(userTenants).toHaveLength(0);
    });
  });

  it("should not allow removing owner", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      // Add admin
      const { email: adminEmail } = await createTestUser(client, "admin@test.com", "adminuser");
      const { rows: adminUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        adminEmail,
      ]);
      const adminId = adminUsers[0].id;
      await createTestUserTenant(client, adminId, tenantId, "admin");

      // Try to remove owner as admin
      const { rows: admins } = await client.query("SELECT * FROM users WHERE id = $1", [adminId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);

      const sessionToken2 = crypto.randomUUID();
      await client.query(
        `INSERT INTO sessions (user_id, tenant_id, session_token, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')`,
        [adminId, tenantId, sessionToken2]
      );

      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken2]
      );

      const caller = createSessionCaller({
        user: admins[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(caller.organizations.removeMember({ userId })).rejects.toThrow(
        "Cannot remove the organization owner"
      );
    });
  });

  it("should reject if not owner/admin", async () => {
    await withTestClient(async (client) => {
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create two members
      const { sessionToken: member1Token, userId: member1Id } = await createTestUserWithSession(
        client
      );
      await createTestUserTenant(client, member1Id, tenantId, "member");

      const { userId: member2Id } = await createTestUserWithSession(client);
      await createTestUserTenant(client, member2Id, tenantId, "member");

      // Update session to point to the target tenant
      await client.query("UPDATE sessions SET tenant_id = $1 WHERE session_token = $2", [
        tenantId,
        member1Token,
      ]);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [
        member1Id,
      ]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [member1Token]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(
        caller.organizations.removeMember({ userId: member2Id })
      ).rejects.toThrow("owners and admins");
    });
  });
});

describe("Organizations Router - Update Member Role", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should change member to admin as owner", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      // Add member
      const { email: memberEmail } = await createTestUser(client, "member@test.com", "member");
      const { rows: memberUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        memberEmail,
      ]);
      const memberId = memberUsers[0].id;
      await createTestUserTenant(client, memberId, tenantId, "member");

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.organizations.updateMemberRole({
        userId: memberId,
        role: "admin",
      });
      expect(result.success).toBe(true);

      // Verify role changed
      const { rows: userTenants } = await client.query(
        "SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
        [memberId, tenantId]
      );
      expect(userTenants[0].role).toBe("admin");
    });
  });

  it("should not allow admin to change owner", async () => {
    await withTestClient(async (client) => {
      const { userId: ownerId, tenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      // Create admin
      const { sessionToken, userId: adminId } = await createTestUserWithSession(client);
      await createTestUserTenant(client, adminId, tenantId, "admin");

      // Update session to point to the target tenant
      await client.query("UPDATE sessions SET tenant_id = $1 WHERE session_token = $2", [
        tenantId,
        sessionToken,
      ]);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [adminId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(
        caller.organizations.updateMemberRole({ userId: ownerId, role: "member" })
      ).rejects.toThrow("Cannot change owner's role");
    });
  });

  it("should reject member changing roles", async () => {
    await withTestClient(async (client) => {
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create two members
      const { sessionToken: member1Token, userId: member1Id } = await createTestUserWithSession(
        client
      );
      await createTestUserTenant(client, member1Id, tenantId, "member");

      const { userId: member2Id } = await createTestUserWithSession(client);
      await createTestUserTenant(client, member2Id, tenantId, "member");

      // Update session to point to the target tenant
      await client.query("UPDATE sessions SET tenant_id = $1 WHERE session_token = $2", [
        tenantId,
        member1Token,
      ]);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [
        member1Id,
      ]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [member1Token]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(
        caller.organizations.updateMemberRole({ userId: member2Id, role: "admin" })
      ).rejects.toThrow("owners and admins");
    });
  });
});

describe("Organizations Router - Transfer Ownership", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should successfully transfer ownership", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId: ownerId, tenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      // Add member to transfer to
      const { email: memberEmail } = await createTestUser(client, "newowner@test.com", "newowner");
      const { rows: memberUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        memberEmail,
      ]);
      const memberId = memberUsers[0].id;
      await createTestUserTenant(client, memberId, tenantId, "member");

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [ownerId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.organizations.transferOwnership({ userId: memberId });
      expect(result.success).toBe(true);

      // Verify ownership transferred
      const { rows: newOwner } = await client.query(
        "SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
        [memberId, tenantId]
      );
      expect(newOwner[0].role).toBe("owner");

      // Verify previous owner is now admin
      const { rows: previousOwner } = await client.query(
        "SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
        [ownerId, tenantId]
      );
      expect(previousOwner[0].role).toBe("admin");
    });
  });

  it("should only allow owner to transfer", async () => {
    await withTestClient(async (client) => {
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create admin and member
      const { sessionToken: adminToken, userId: adminId } = await createTestUserWithSession(
        client
      );
      await createTestUserTenant(client, adminId, tenantId, "admin");

      const { userId: memberId } = await createTestUserWithSession(client);
      await createTestUserTenant(client, memberId, tenantId, "member");

      // Update session to point to the target tenant
      await client.query("UPDATE sessions SET tenant_id = $1 WHERE session_token = $2", [
        tenantId,
        adminToken,
      ]);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [adminId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [adminToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(
        caller.organizations.transferOwnership({ userId: memberId })
      ).rejects.toThrow("Only the owner can transfer ownership");
    });
  });

  it("should update previous owner to admin", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId: ownerId, tenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      const { email: memberEmail } = await createTestUser(client, "newowner@test.com", "newowner");
      const { rows: memberUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        memberEmail,
      ]);
      const memberId = memberUsers[0].id;
      await createTestUserTenant(client, memberId, tenantId, "admin");

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [ownerId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await caller.organizations.transferOwnership({ userId: memberId });

      // Verify previous owner role
      const { rows: previousOwner } = await client.query(
        "SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
        [ownerId, tenantId]
      );
      expect(previousOwner[0].role).toBe("admin");
    });
  });
});

describe("Organizations Router - Leave", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    // await closeTestPool(); // Moved to global teardown
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should successfully leave organization", async () => {
    await withTestClient(async (client) => {
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create member to leave
      const { sessionToken, userId: memberId } = await createTestUserWithSession(client);
      await createTestUserTenant(client, memberId, tenantId, "member");

      // Create another org for member to switch to
      const { tenantId: otherTenantId } = await createTestUserWithSession(client, {
        email: `other-${Date.now()}@test.com`,
        role: "owner",
      });
      await createTestUserTenant(client, memberId, otherTenantId, "member");

      // Update member's session to point to the org they want to leave (not their own org)
      await client.query("UPDATE sessions SET tenant_id = $1 WHERE session_token = $2", [
        tenantId,
        sessionToken,
      ]);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [memberId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.organizations.leave();
      expect(result.success).toBe(true);

      // Verify member was removed
      const { rows: userTenants } = await client.query(
        "SELECT * FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
        [memberId, tenantId]
      );
      expect(userTenants).toHaveLength(0);
    });
  });

  it("should not allow owner to leave", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      await expect(caller.organizations.leave()).rejects.toThrow(
        "Owners cannot leave the organization"
      );
    });
  });

  it("should switch active org if leaving current", async () => {
    await withTestClient(async (client) => {
      const { tenantId: firstTenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      // Create member
      const { sessionToken, userId: memberId } = await createTestUserWithSession(client);
      await createTestUserTenant(client, memberId, firstTenantId, "member");

      // Create second org for member
      const { tenantId: secondTenantId } = await createTestUserWithSession(client, {
        email: `second-${Date.now()}@test.com`,
        role: "owner",
      });
      await createTestUserTenant(client, memberId, secondTenantId, "member");

      // Update member's session to point to the first org they want to leave
      await client.query("UPDATE sessions SET tenant_id = $1 WHERE session_token = $2", [
        firstTenantId,
        sessionToken,
      ]);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [memberId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        firstTenantId,
      ]);
      const { rows: sessions } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );

      const caller = createSessionCaller({
        user: users[0],
        tenant: tenants[0],
        session: sessions[0],
      });

      const result = await caller.organizations.leave();
      expect(result.success).toBe(true);
      expect(result.newActiveTenant).toBeDefined();
      expect(result.newActiveTenant?.id).not.toBe(firstTenantId);
    });
  });
});
