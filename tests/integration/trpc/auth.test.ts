/**
 * Integration tests for the auth tRPC router.
 *
 * Tests verify authentication flows including signup, signin, signout,
 * user info retrieval, and password reset functionality.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestUser,
  createTestUserWithSession,
  createTestUserWithApiKey,
  createTestPasswordResetToken,
  createExpiredPasswordResetToken,
  generateTestEmail,
  generateTestUsername,
} from "../../helpers";
import {
  createPublicCaller,
  createSessionCaller,
  createApiKeyCaller,
  createTestApiKeyObject,
} from "../../helpers/api";

describe("Auth Router - Signup", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should create user, organization, and session on signup", async () => {
    const caller = createPublicCaller();
    const email = generateTestEmail();
    const username = generateTestUsername();

    const result = await caller.auth.signup({
      email,
      username,
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(email);
    expect(result.user.username).toBe(username);
    expect(result.tenant).toBeDefined();
    expect(result.tenant?.name).toBe(`${username}'s Organization`);
    expect(result.sessionToken).toBeDefined();
    expect(typeof result.sessionToken).toBe("string");
  });

  it("should return user without password_hash", async () => {
    const caller = createPublicCaller();
    const result = await caller.auth.signup({
      email: generateTestEmail(),
      username: generateTestUsername(),
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
    });

    expect(result.user).toBeDefined();
    expect("password_hash" in result.user).toBe(false);
  });

  it("should reject signup with duplicate email", async () => {
    const email = generateTestEmail();
    const caller = createPublicCaller();

    // First signup
    await caller.auth.signup({
      email,
      username: generateTestUsername(),
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
    });

    // Second signup with same email
    await expect(
      caller.auth.signup({
        email,
        username: generateTestUsername(),
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
      })
    ).rejects.toThrow("Email already in use");
  });

  it("should reject signup with duplicate username", async () => {
    const username = generateTestUsername();
    const caller = createPublicCaller();

    // First signup
    await caller.auth.signup({
      email: generateTestEmail(),
      username,
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
    });

    // Second signup with same username
    await expect(
      caller.auth.signup({
        email: generateTestEmail(),
        username,
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
      })
    ).rejects.toThrow("Username already taken");
  });

  it("should reject signup with invalid email format", async () => {
    const caller = createPublicCaller();

    await expect(
      caller.auth.signup({
        email: "invalid-email",
        username: generateTestUsername(),
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
      })
    ).rejects.toThrow();
  });

  it("should reject signup with short password", async () => {
    const caller = createPublicCaller();

    await expect(
      caller.auth.signup({
        email: generateTestEmail(),
        username: generateTestUsername(),
        password: "short",
        confirmPassword: "short",
      })
    ).rejects.toThrow();
  });
});

describe("Auth Router - Signin", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should sign in with valid email credentials", async () => {
    const caller = createPublicCaller();
    const email = generateTestEmail();
    const username = generateTestUsername();
    const password = "StrongPassword123!";

    // First create a user
    await caller.auth.signup({ email, username, password, confirmPassword: password });

    // Sign in with email
    const result = await caller.auth.signin({
      identifier: email,
      password,
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(email);
    expect(result.sessionToken).toBeDefined();
  });

  it("should sign in with valid username credentials", async () => {
    const caller = createPublicCaller();
    const email = generateTestEmail();
    const username = generateTestUsername();
    const password = "StrongPassword123!";

    // First create a user
    await caller.auth.signup({ email, username, password, confirmPassword: password });

    // Sign in with username
    const result = await caller.auth.signin({
      identifier: username,
      password,
    });

    expect(result.user).toBeDefined();
    expect(result.user.username).toBe(username);
    expect(result.sessionToken).toBeDefined();
  });

  it("should reject signin with invalid password", async () => {
    const caller = createPublicCaller();
    const email = generateTestEmail();
    const username = generateTestUsername();

    // Create user
    await caller.auth.signup({
      email,
      username,
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
    });

    // Try to sign in with wrong password
    await expect(
      caller.auth.signin({
        identifier: email,
        password: "WrongPassword123!",
      })
    ).rejects.toThrow("Invalid credentials");
  });

  it("should reject signin with non-existent user", async () => {
    const caller = createPublicCaller();

    await expect(
      caller.auth.signin({
        identifier: "nonexistent@test.com",
        password: "SomePassword123!",
      })
    ).rejects.toThrow("Invalid credentials");
  });

  it("should return tenant information on signin", async () => {
    const caller = createPublicCaller();
    const email = generateTestEmail();
    const username = generateTestUsername();
    const password = "StrongPassword123!";

    await caller.auth.signup({ email, username, password, confirmPassword: password });

    const result = await caller.auth.signin({
      identifier: email,
      password,
    });

    expect(result.tenant).toBeDefined();
    expect(result.tenant?.id).toBeDefined();
  });
});

describe("Auth Router - Signout", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should destroy session on signout with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

      // Get user and tenant for caller
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

      const result = await caller.auth.signout();
      expect(result.success).toBe(true);

      // Verify session is deleted
      const { rows: remaining } = await client.query(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken]
      );
      expect(remaining).toHaveLength(0);
    });
  });

  it("should reject signout with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId } = await createTestUserWithApiKey(client);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);

      const apiKeyObj = createTestApiKeyObject(tenantId, userId);
      const caller = createApiKeyCaller({
        user: users[0],
        tenant: tenants[0],
        apiKey: apiKeyObj,
        rawKey: apiKey,
      });

      await expect(caller.auth.signout()).rejects.toThrow(
        "Signout requires session authentication"
      );
    });
  });
});

describe("Auth Router - Me", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should return current user info with session auth", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId, email, username } =
        await createTestUserWithSession(client);

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

      const result = await caller.auth.me();

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.username).toBe(username);
      expect(result.tenant).toBeDefined();
      expect(result.tenant?.id).toBe(tenantId);
    });
  });

  it("should return current user info with API key auth", async () => {
    await withTestClient(async (client) => {
      const { apiKey, userId, tenantId, email, username } = await createTestUserWithApiKey(client);

      const { rows: users } = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
      const { rows: tenants } = await client.query("SELECT * FROM tenants WHERE id = $1", [
        tenantId,
      ]);

      const apiKeyObj = createTestApiKeyObject(tenantId, userId);
      const caller = createApiKeyCaller({
        user: users[0],
        tenant: tenants[0],
        apiKey: apiKeyObj,
        rawKey: apiKey,
      });

      const result = await caller.auth.me();

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.username).toBe(username);
      expect(result.tenant).toBeDefined();
      expect(result.tenant?.id).toBe(tenantId);
    });
  });

  it("should not include password_hash in response", async () => {
    await withTestClient(async (client) => {
      const { sessionToken, userId, tenantId } = await createTestUserWithSession(client);

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

      const result = await caller.auth.me();
      expect("password_hash" in result.user).toBe(false);
    });
  });
});

describe("Auth Router - Password Reset", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should create password reset token for existing user", async () => {
    const caller = createPublicCaller();
    const email = generateTestEmail();
    const username = generateTestUsername();

    // Create user
    await caller.auth.signup({
      email,
      username,
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
    });

    // Request password reset
    const result = await caller.auth.requestPasswordReset({ email });
    expect(result.success).toBe(true);

    // Verify token was created in database
    await withTestClient(async (client) => {
      const { rows: users } = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      const { rows: tokens } = await client.query(
        "SELECT * FROM password_reset_tokens WHERE user_id = $1",
        [users[0].id]
      );
      expect(tokens).toHaveLength(1);
      expect(tokens[0].used_at).toBeNull();
    });
  });

  it("should return success for non-existent email (prevent enumeration)", async () => {
    const caller = createPublicCaller();

    // Request reset for non-existent email
    const result = await caller.auth.requestPasswordReset({
      email: "nonexistent@test.com",
    });

    // Should still return success to prevent email enumeration
    expect(result.success).toBe(true);
  });

  it("should validate password reset token", async () => {
    await withTestClient(async (client) => {
      const { userId } = await createTestUser(client);
      const token = await createTestPasswordResetToken(client, userId);

      const caller = createPublicCaller();
      const result = await caller.auth.validateResetToken({ token });

      expect(result.valid).toBe(true);
    });
  });

  it("should reject expired password reset token", async () => {
    await withTestClient(async (client) => {
      const { userId } = await createTestUser(client);
      const token = await createExpiredPasswordResetToken(client, userId);

      const caller = createPublicCaller();
      const result = await caller.auth.validateResetToken({ token });

      expect(result.valid).toBe(false);
    });
  });

  it("should reset password with valid token", async () => {
    await withTestClient(async (client) => {
      const email = generateTestEmail();
      const { userId } = await createTestUser(client, email);
      const token = await createTestPasswordResetToken(client, userId);

      const caller = createPublicCaller();
      const newPassword = "NewStrongPassword123!";

      const result = await caller.auth.resetPassword({
        token,
        password: newPassword,
        confirmPassword: newPassword,
      });

      expect(result.success).toBe(true);

      // Verify can sign in with new password
      const signinResult = await caller.auth.signin({
        identifier: email,
        password: newPassword,
      });

      expect(signinResult.user).toBeDefined();
    });
  });

  it("should reject password reset with expired token", async () => {
    await withTestClient(async (client) => {
      const { userId } = await createTestUser(client);
      const token = await createExpiredPasswordResetToken(client, userId);

      const caller = createPublicCaller();

      await expect(
        caller.auth.resetPassword({
          token,
          password: "NewStrongPassword123!",
          confirmPassword: "NewStrongPassword123!",
        })
      ).rejects.toThrow("Invalid or expired reset token");
    });
  });

  it("should reject password reset with already used token", async () => {
    await withTestClient(async (client) => {
      const { userId } = await createTestUser(client);
      const token = await createTestPasswordResetToken(client, userId, { used: true });

      const caller = createPublicCaller();

      await expect(
        caller.auth.resetPassword({
          token,
          password: "NewStrongPassword123!",
          confirmPassword: "NewStrongPassword123!",
        })
      ).rejects.toThrow("Invalid or expired reset token");
    });
  });

  it("should invalidate token after successful reset", async () => {
    await withTestClient(async (client) => {
      const { userId } = await createTestUser(client);
      const token = await createTestPasswordResetToken(client, userId);

      const caller = createPublicCaller();

      // First reset should work
      await caller.auth.resetPassword({
        token,
        password: "NewStrongPassword123!",
        confirmPassword: "NewStrongPassword123!",
      });

      // Second reset with same token should fail
      await expect(
        caller.auth.resetPassword({
          token,
          password: "AnotherPassword123!",
          confirmPassword: "AnotherPassword123!",
        })
      ).rejects.toThrow("Invalid or expired reset token");
    });
  });
});

describe("Auth Router - Error Cases", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should require authentication for me endpoint", async () => {
    const caller = createPublicCaller();

    await expect(caller.auth.me()).rejects.toThrow();
  });

  it("should require authentication for signout endpoint", async () => {
    const caller = createPublicCaller();

    await expect(caller.auth.signout()).rejects.toThrow();
  });
});
