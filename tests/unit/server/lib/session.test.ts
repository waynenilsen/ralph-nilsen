import { describe, it, expect } from "bun:test";
import { hashPassword, comparePassword, toUserPublic } from "@/server/lib/session";
import type { User } from "@/shared/types";

describe("Session Library - Unit Tests", () => {
  describe("hashPassword", () => {
    it("should produce a bcrypt hash", async () => {
      const password = "securePassword123!";
      const hash = await hashPassword(password);

      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it("should produce different hashes for the same password (salt)", async () => {
      const password = "securePassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // bcrypt uses random salt, so same input produces different hashes
      expect(hash1).not.toBe(hash2);
    });

    it("should produce hashes of consistent length", async () => {
      const password = "securePassword123!";
      const hash = await hashPassword(password);

      // bcrypt hashes are always 60 characters
      expect(hash.length).toBe(60);
    });

    it("should hash empty string", async () => {
      const hash = await hashPassword("");
      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash.length).toBe(60);
    });

    it("should handle very long passwords", async () => {
      const longPassword = "a".repeat(1000);
      const hash = await hashPassword(longPassword);

      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash.length).toBe(60);
    });

    it("should handle unicode characters", async () => {
      const unicodePassword = "p@ssw0rd_with_emoji!";
      const hash = await hashPassword(unicodePassword);

      expect(hash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe("comparePassword", () => {
    it("should return true for matching password", async () => {
      const password = "securePassword123!";
      const hash = await hashPassword(password);

      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it("should return false for non-matching password", async () => {
      const password = "securePassword123!";
      const hash = await hashPassword(password);

      const result = await comparePassword("wrongPassword", hash);
      expect(result).toBe(false);
    });

    it("should return false for empty password when hash is not empty", async () => {
      const password = "securePassword123!";
      const hash = await hashPassword(password);

      const result = await comparePassword("", hash);
      expect(result).toBe(false);
    });

    it("should return true for empty password when hash is from empty", async () => {
      const hash = await hashPassword("");
      const result = await comparePassword("", hash);
      expect(result).toBe(true);
    });

    it("should be case sensitive", async () => {
      const password = "SecurePassword123!";
      const hash = await hashPassword(password);

      const result = await comparePassword("securepassword123!", hash);
      expect(result).toBe(false);
    });

    it("should handle password with special characters", async () => {
      const password = "p@$$w0rd!#%^&*()_+{}|:<>?";
      const hash = await hashPassword(password);

      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it("should handle password with whitespace", async () => {
      const password = "password with spaces";
      const hash = await hashPassword(password);

      const result = await comparePassword(password, hash);
      expect(result).toBe(true);

      // Different whitespace should not match
      const result2 = await comparePassword("password  with spaces", hash);
      expect(result2).toBe(false);
    });
  });

  describe("toUserPublic", () => {
    const mockUser: User = {
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      password_hash: "$2b$12$hashedpassword",
      email_verified: true,
      created_at: new Date("2024-01-01T00:00:00Z"),
      updated_at: new Date("2024-01-02T00:00:00Z"),
    };

    it("should return user without password_hash", () => {
      const publicUser = toUserPublic(mockUser);

      expect(publicUser).not.toHaveProperty("password_hash");
    });

    it("should include id", () => {
      const publicUser = toUserPublic(mockUser);
      expect(publicUser.id).toBe(mockUser.id);
    });

    it("should include email", () => {
      const publicUser = toUserPublic(mockUser);
      expect(publicUser.email).toBe(mockUser.email);
    });

    it("should include username", () => {
      const publicUser = toUserPublic(mockUser);
      expect(publicUser.username).toBe(mockUser.username);
    });

    it("should include email_verified", () => {
      const publicUser = toUserPublic(mockUser);
      expect(publicUser.email_verified).toBe(mockUser.email_verified);
    });

    it("should include created_at", () => {
      const publicUser = toUserPublic(mockUser);
      expect(publicUser.created_at).toEqual(mockUser.created_at);
    });

    it("should include updated_at", () => {
      const publicUser = toUserPublic(mockUser);
      expect(publicUser.updated_at).toEqual(mockUser.updated_at);
    });

    it("should only include the expected properties", () => {
      const publicUser = toUserPublic(mockUser);
      const keys = Object.keys(publicUser);

      expect(keys).toEqual(
        expect.arrayContaining([
          "id",
          "email",
          "username",
          "email_verified",
          "created_at",
          "updated_at",
        ])
      );
      expect(keys.length).toBe(6);
    });

    it("should handle unverified email", () => {
      const unverifiedUser: User = {
        ...mockUser,
        email_verified: false,
      };

      const publicUser = toUserPublic(unverifiedUser);
      expect(publicUser.email_verified).toBe(false);
    });

    it("should not mutate the original user object", () => {
      const originalUser = { ...mockUser };
      toUserPublic(mockUser);

      expect(mockUser).toEqual(originalUser);
    });
  });
});
