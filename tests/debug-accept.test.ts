import { describe, it, expect, beforeAll, beforeEach } from "bun:test";
import {
  getTestPool,
  withTestClient,
  cleanupTestData,
  createTestUserWithSession,
  createTestUser,
} from "./helpers";
import {
  createSessionCaller,
} from "./helpers/api";
import type { OrganizationInvitation } from "@/shared/types";

describe("Accept test debug", () => {
  beforeAll(() => {
    console.log("beforeAll: getting test pool");
    getTestPool();
    console.log("beforeAll: got test pool");
  });

  beforeEach(async () => {
    console.log("beforeEach: starting cleanup");
    await withTestClient(cleanupTestData);
    console.log("beforeEach: cleanup done");
  });

  it("should successfully accept invitation", async () => {
    console.log("Test starting");
    await withTestClient(async (client) => {
      console.log("Step 1: Creating org owner");
      const { tenantId } = await createTestUserWithSession(client, { role: "owner" });
      console.log("Step 1 done, tenantId:", tenantId);

      const inviteEmail = "newuser@test.com";
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      console.log("Step 2: Getting owner user");
      const { rows: ownerUsers } = await client.query("SELECT id FROM users LIMIT 1");
      console.log("Step 2 done, owner:", ownerUsers[0]?.id);

      console.log("Step 3: Creating invitation");
      const { rows: invitations } = await client.query<OrganizationInvitation>(
        `INSERT INTO organization_invitations
         (tenant_id, email, role, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tenantId, inviteEmail, "member", ownerUsers[0].id, expiresAt]
      );
      console.log("Step 3 done, invitation created");

      const invitation = invitations[0];

      console.log("Step 4: Creating test user");
      await createTestUser(client, inviteEmail, "newuser");
      console.log("Step 4 done");

      console.log("Step 5: Getting new user");
      const { rows: newUsers } = await client.query("SELECT id FROM users WHERE email = $1", [
        inviteEmail,
      ]);
      const newUserId = newUsers[0].id;
      console.log("Step 5 done, userId:", newUserId);

      console.log("Step 6: Creating session");
      const sessionToken = crypto.randomUUID();
      await client.query(
        `INSERT INTO sessions (user_id, tenant_id, session_token, expires_at)
         VALUES ($1, NULL, $2, NOW() + INTERVAL '30 days')`,
        [newUserId, sessionToken]
      );
      console.log("Step 6 done");

      console.log("Step 7: Getting user and session data");
      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [
        newUserId,
      ]);
      const { rows: sessions } = await client.query("SELECT * FROM sessions WHERE user_id = $1", [
        newUserId,
      ]);
      console.log("Step 7 done");

      console.log("Step 8: Creating caller");
      const caller = createSessionCaller({
        user: users[0],
        tenant: null as any,
        session: sessions[0],
      });
      console.log("Step 8 done");

      console.log("Step 9: Calling invitations.accept");
      const result = await caller.invitations.accept({
        token: invitation.token,
      });
      console.log("Step 9 done, result:", result);

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe(tenantId);
    });
    console.log("Test completed");
  }, 60000); // 60 second timeout
});
