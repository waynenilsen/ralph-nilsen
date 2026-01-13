/**
 * Integration tests for the invitations tRPC router.
 *
 * Tests all invitation endpoints including create, list, revoke,
 * getByToken, accept, and decline with proper permission checks.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestUserWithSession,
  createTestTenant,
  createTestUserTenant,
  createTestUser,
} from "../../helpers";
import {
  createSessionCaller,
  createPublicCaller,
  createTestUserObject,
  createTestTenantObject,
  createTestSessionObject,
} from "../../helpers/api";
import type { OrganizationInvitation } from "@/shared/types";
import { adminPool } from "@/server/db";

describe("Invitations Router - Create", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should successfully create invitation as owner", async () => {
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

      const result = await caller.invitations.create({
        email: "invited@test.com",
        role: "member",
      });

      expect(result.id).toBeDefined();
      expect(result.email).toBe("invited@test.com");
      expect(result.role).toBe("member");
      expect(result.status).toBe("pending");
      expect(result.token).toBeDefined();
      expect(result.invited_by).toBe(userId);
      expect(result.tenant_id).toBe(tenantId);
    });
  });

  it("should successfully create invitation as admin", async () => {
    await withTestClient(async (client) => {
      // Create owner
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create admin user
      const { sessionToken, userId } = await createTestUserWithSession(client);
      await createTestUserTenant(client, userId, tenantId, "admin");

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

      const result = await caller.invitations.create({
        email: "invited@test.com",
        role: "member",
      });

      expect(result.status).toBe("pending");
    });
  });

  it("should reject duplicate pending invitation", async () => {
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

      // Create first invitation
      await caller.invitations.create({
        email: "invited@test.com",
        role: "member",
      });

      // Try to create duplicate
      await expect(
        caller.invitations.create({
          email: "invited@test.com",
          role: "member",
        })
      ).rejects.toThrow("pending invitation already exists");
    });
  });

  it("should reject invitation if not owner/admin", async () => {
    await withTestClient(async (client) => {
      // Create owner
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create member user
      const { sessionToken, userId } = await createTestUserWithSession(client);
      await createTestUserTenant(client, userId, tenantId, "member");

      // Update session to point to the owner's tenant
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

      await expect(
        caller.invitations.create({
          email: "invited@test.com",
          role: "member",
        })
      ).rejects.toThrow("owners and admins");
    });
  });

  it("should reject invitation if user is already a member", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId, email } = await createTestUserWithSession(client, {
        role: "owner",
      });

      // Create another member
      const { email: memberEmail } = await createTestUser(
        client,
        "member@test.com",
        "memberuser"
      );
      const { rows: memberUsers } = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [memberEmail]
      );
      await createTestUserTenant(client, memberUsers[0].id, tenantId, "member");

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

      await expect(
        caller.invitations.create({
          email: memberEmail,
          role: "member",
        })
      ).rejects.toThrow("already a member");
    });
  });

  it("should set expiration to 7 days from now", async () => {
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

      const before = Date.now();
      const result = await caller.invitations.create({
        email: "invited@test.com",
        role: "member",
      });
      const after = Date.now();

      const expiresAt = new Date(result.expires_at).getTime();
      const expectedMin = before + 7 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });
  });
});

describe("Invitations Router - List", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should return all invitations for org", async () => {
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

      // Create multiple invitations
      await caller.invitations.create({ email: "user1@test.com", role: "member" });
      await caller.invitations.create({ email: "user2@test.com", role: "admin" });

      const result = await caller.invitations.list();

      expect(result).toHaveLength(2);
      expect(result[0].inviter_name).toBeDefined();
      expect(result[0].inviter_email).toBeDefined();
    });
  });

  it("should reject if not owner/admin", async () => {
    await withTestClient(async (client) => {
      // Create owner
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create member user
      const { sessionToken, userId } = await createTestUserWithSession(client);
      await createTestUserTenant(client, userId, tenantId, "member");

      // Update session to point to the owner's tenant
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

      await expect(caller.invitations.list()).rejects.toThrow("owners and admins");
    });
  });
});

describe("Invitations Router - Revoke", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should successfully revoke pending invitation", async () => {
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

      const invitation = await caller.invitations.create({
        email: "invited@test.com",
        role: "member",
      });

      const result = await caller.invitations.revoke({
        invitationId: invitation.id,
      });

      expect(result.status).toBe("revoked");
    });
  });

  it("should not revoke non-pending invitation", async () => {
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

      const invitation = await caller.invitations.create({
        email: "invited@test.com",
        role: "member",
      });

      // Revoke once
      await caller.invitations.revoke({ invitationId: invitation.id });

      // Try to revoke again
      await expect(
        caller.invitations.revoke({ invitationId: invitation.id })
      ).rejects.toThrow("not found or cannot be revoked");
    });
  });
});

describe("Invitations Router - GetByToken", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should return valid invitation details", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId, username } = await createTestUserWithSession(
        client,
        {
          role: "owner",
        }
      );

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

      const invitation = await caller.invitations.create({
        email: "invited@test.com",
        role: "member",
      });

      const publicCaller = createPublicCaller();
      const result = await publicCaller.invitations.getByToken({
        token: invitation.token,
      });

      expect(result).not.toBeNull();
      expect(result!.organizationName).toBeDefined();
      expect(result!.inviterName).toBe(username);
      expect(result!.role).toBe("member");
      expect(result!.isExpired).toBe(false);
      expect(result!.status).toBe("pending");
    });
  });

  it("should return null for invalid token", async () => {
    const publicCaller = createPublicCaller();
    const result = await publicCaller.invitations.getByToken({
      token: "00000000-0000-0000-0000-000000000000",
    });

    expect(result).toBeNull();
  });

  it("should mark expired invitations", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client, {
        role: "owner",
      });

      // Create invitation with expired date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Yesterday

      const { rows } = await client.query<OrganizationInvitation>(
        `INSERT INTO organization_invitations
         (tenant_id, email, role, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tenantId, "expired@test.com", "member", userId, expiresAt]
      );

      const invitation = rows[0];

      const publicCaller = createPublicCaller();
      const result = await publicCaller.invitations.getByToken({
        token: invitation.token,
      });

      expect(result).not.toBeNull();
      expect(result!.isExpired).toBe(true);
    });
  });
});

describe("Invitations Router - Accept", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should successfully accept invitation", async () => {
    await withTestClient(async (client) => {
      // Create org owner
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create invitation for new user
      const inviteEmail = "newuser@test.com";
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { rows: ownerUsers } = await client.query("SELECT id FROM users LIMIT 1");
      const { rows: invitations } = await client.query<OrganizationInvitation>(
        `INSERT INTO organization_invitations
         (tenant_id, email, role, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tenantId, inviteEmail, "member", ownerUsers[0].id, expiresAt]
      );

      const invitation = invitations[0];

      // Create new user to accept invitation
      await createTestUser(client, inviteEmail, "newuser");
      const { rows: newUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        inviteEmail,
      ]);
      const newUserId = newUsers[0].id;

      // Create session for new user (without tenant yet)
      const sessionToken = crypto.randomUUID();
      await client.query(
        `INSERT INTO sessions (user_id, tenant_id, session_token, expires_at)
         VALUES ($1, NULL, $2, NOW() + INTERVAL '30 days')`,
        [newUserId, sessionToken]
      );

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [
        newUserId,
      ]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE user_id = $1", [
        newUserId,
      ]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: null as any,
        session: sessions[0],
      });

      const result = await caller.invitations.accept({
        token: invitation.token,
      });

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe(tenantId);

      // Verify user was added to organization
      const { rows: userTenants } = await client.query(
        "SELECT * FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
        [newUserId, tenantId]
      );
      expect(userTenants).toHaveLength(1);
      expect(userTenants[0].role).toBe("member");
    });
  });

  it("should add user to organization with correct role", async () => {
    await withTestClient(async (client) => {
      // Create org owner
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      // Create invitation with admin role
      const inviteEmail = "admin@test.com";
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { rows: ownerUsers } = await client.query("SELECT id FROM users LIMIT 1");
      const { rows: invitations } = await client.query<OrganizationInvitation>(
        `INSERT INTO organization_invitations
         (tenant_id, email, role, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tenantId, inviteEmail, "admin", ownerUsers[0].id, expiresAt]
      );

      const invitation = invitations[0];

      // Create new user
      await createTestUser(client, inviteEmail, "adminuser");
      const { rows: newUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        inviteEmail,
      ]);
      const newUserId = newUsers[0].id;

      const sessionToken = crypto.randomUUID();
      await client.query(
        `INSERT INTO sessions (user_id, tenant_id, session_token, expires_at)
         VALUES ($1, NULL, $2, NOW() + INTERVAL '30 days')`,
        [newUserId, sessionToken]
      );

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [
        newUserId,
      ]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE user_id = $1", [
        newUserId,
      ]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: null as any,
        session: sessions[0],
      });

      await caller.invitations.accept({ token: invitation.token });

      // Verify role
      const { rows: userTenants } = await client.query(
        "SELECT * FROM user_tenants WHERE user_id = $1 AND tenant_id = $2",
        [newUserId, tenantId]
      );
      expect(userTenants[0].role).toBe("admin");
    });
  });

  it("should reject expired invitation", async () => {
    await withTestClient(async (client) => {
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      const inviteEmail = "expired@test.com";
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Yesterday

      const { rows: ownerUsers } = await client.query("SELECT id FROM users LIMIT 1");
      const { rows: invitations } = await client.query<OrganizationInvitation>(
        `INSERT INTO organization_invitations
         (tenant_id, email, role, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tenantId, inviteEmail, "member", ownerUsers[0].id, expiresAt]
      );

      const invitation = invitations[0];

      await createTestUser(client, inviteEmail, "expireduser");
      const { rows: newUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        inviteEmail,
      ]);
      const newUserId = newUsers[0].id;

      const sessionToken = crypto.randomUUID();
      await client.query(
        `INSERT INTO sessions (user_id, tenant_id, session_token, expires_at)
         VALUES ($1, NULL, $2, NOW() + INTERVAL '30 days')`,
        [newUserId, sessionToken]
      );

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [
        newUserId,
      ]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE user_id = $1", [
        newUserId,
      ]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: null as any,
        session: sessions[0],
      });

      await expect(
        caller.invitations.accept({ token: invitation.token })
      ).rejects.toThrow("expired");
    });
  });

  it("should reject already-used invitation", async () => {
    await withTestClient(async (client) => {
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      const inviteEmail = "used@test.com";
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { rows: ownerUsers } = await client.query("SELECT id FROM users LIMIT 1");
      const { rows: invitations } = await client.query<OrganizationInvitation>(
        `INSERT INTO organization_invitations
         (tenant_id, email, role, invited_by, expires_at, status, accepted_at)
         VALUES ($1, $2, $3, $4, $5, 'accepted', NOW()) RETURNING *`,
        [tenantId, inviteEmail, "member", ownerUsers[0].id, expiresAt]
      );

      const invitation = invitations[0];

      await createTestUser(client, inviteEmail, "useduser");
      const { rows: newUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        inviteEmail,
      ]);
      const newUserId = newUsers[0].id;

      const sessionToken = crypto.randomUUID();
      await client.query(
        `INSERT INTO sessions (user_id, tenant_id, session_token, expires_at)
         VALUES ($1, NULL, $2, NOW() + INTERVAL '30 days')`,
        [newUserId, sessionToken]
      );

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [
        newUserId,
      ]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE user_id = $1", [
        newUserId,
      ]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: null as any,
        session: sessions[0],
      });

      await expect(
        caller.invitations.accept({ token: invitation.token })
      ).rejects.toThrow("already been accepted");
    });
  });
});

describe("Invitations Router - Decline", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should successfully decline invitation", async () => {
    await withTestClient(async (client) => {
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      const inviteEmail = "decline@test.com";
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { rows: ownerUsers } = await client.query("SELECT id FROM users LIMIT 1");
      const { rows: invitations } = await client.query<OrganizationInvitation>(
        `INSERT INTO organization_invitations
         (tenant_id, email, role, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tenantId, inviteEmail, "member", ownerUsers[0].id, expiresAt]
      );

      const invitation = invitations[0];

      await createTestUser(client, inviteEmail, "declineuser");
      const { rows: newUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        inviteEmail,
      ]);
      const newUserId = newUsers[0].id;

      const sessionToken = crypto.randomUUID();
      await client.query(
        `INSERT INTO sessions (user_id, tenant_id, session_token, expires_at)
         VALUES ($1, NULL, $2, NOW() + INTERVAL '30 days')`,
        [newUserId, sessionToken]
      );

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [
        newUserId,
      ]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE user_id = $1", [
        newUserId,
      ]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: null as any,
        session: sessions[0],
      });

      const result = await caller.invitations.decline({
        token: invitation.token,
      });

      expect(result.status).toBe("declined");
    });
  });

  it("should not decline already-accepted invitation", async () => {
    await withTestClient(async (client) => {
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });

      const inviteEmail = "accepted@test.com";
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { rows: ownerUsers } = await client.query("SELECT id FROM users LIMIT 1");
      const { rows: invitations } = await client.query<OrganizationInvitation>(
        `INSERT INTO organization_invitations
         (tenant_id, email, role, invited_by, expires_at, status, accepted_at)
         VALUES ($1, $2, $3, $4, $5, 'accepted', NOW()) RETURNING *`,
        [tenantId, inviteEmail, "member", ownerUsers[0].id, expiresAt]
      );

      const invitation = invitations[0];

      await createTestUser(client, inviteEmail, "accepteduser");
      const { rows: newUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        inviteEmail,
      ]);
      const newUserId = newUsers[0].id;

      const sessionToken = crypto.randomUUID();
      await client.query(
        `INSERT INTO sessions (user_id, tenant_id, session_token, expires_at)
         VALUES ($1, NULL, $2, NOW() + INTERVAL '30 days')`,
        [newUserId, sessionToken]
      );

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [
        newUserId,
      ]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE user_id = $1", [
        newUserId,
      ]);

      const caller = createSessionCaller({
        user: users[0],
        tenant: null as any,
        session: sessions[0],
      });

      await expect(
        caller.invitations.decline({ token: invitation.token })
      ).rejects.toThrow("already been accepted");
    });
  });
});
