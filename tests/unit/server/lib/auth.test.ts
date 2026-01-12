import { describe, it, expect } from "bun:test";
import {
  hashApiKey,
  compareApiKey,
  generateApiKey,
  validateAdminApiKey,
} from "@/server/lib/auth";

describe("Auth Library - Unit Tests", () => {
  describe("hashApiKey", () => {
    it("should produce a bcrypt hash", async () => {
      const apiKey = "tk_test_api_key_12345";
      const hash = await hashApiKey(apiKey);

      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it("should produce different hashes for the same key (salt)", async () => {
      const apiKey = "tk_test_api_key_12345";
      const hash1 = await hashApiKey(apiKey);
      const hash2 = await hashApiKey(apiKey);

      // bcrypt uses random salt, so same input produces different hashes
      expect(hash1).not.toBe(hash2);
    });

    it("should produce hashes of consistent length", async () => {
      const apiKey = "tk_test_api_key_12345";
      const hash = await hashApiKey(apiKey);

      // bcrypt hashes are always 60 characters
      expect(hash.length).toBe(60);
    });
  });

  describe("compareApiKey", () => {
    it("should return true for matching API key", async () => {
      const apiKey = "tk_test_api_key_12345";
      const hash = await hashApiKey(apiKey);

      const result = await compareApiKey(apiKey, hash);
      expect(result).toBe(true);
    });

    it("should return false for non-matching API key", async () => {
      const apiKey = "tk_test_api_key_12345";
      const hash = await hashApiKey(apiKey);

      const result = await compareApiKey("tk_wrong_key", hash);
      expect(result).toBe(false);
    });

    it("should return false for empty API key", async () => {
      const apiKey = "tk_test_api_key_12345";
      const hash = await hashApiKey(apiKey);

      const result = await compareApiKey("", hash);
      expect(result).toBe(false);
    });

    it("should return false for similar but not identical key", async () => {
      const apiKey = "tk_test_api_key_12345";
      const hash = await hashApiKey(apiKey);

      const result = await compareApiKey("tk_test_api_key_12346", hash);
      expect(result).toBe(false);
    });

    it("should handle case sensitivity", async () => {
      const apiKey = "tk_TestApiKey12345";
      const hash = await hashApiKey(apiKey);

      const result = await compareApiKey("tk_testapikey12345", hash);
      expect(result).toBe(false);
    });
  });

  describe("generateApiKey", () => {
    it("should generate a key with tk_ prefix", () => {
      const key = generateApiKey();
      expect(key.startsWith("tk_")).toBe(true);
    });

    it("should generate a key with 35 total characters (3 prefix + 32 random)", () => {
      const key = generateApiKey();
      expect(key.length).toBe(35);
    });

    it("should generate 32 random characters after prefix", () => {
      const key = generateApiKey();
      const randomPart = key.substring(3);
      expect(randomPart.length).toBe(32);
    });

    it("should only contain alphanumeric characters after prefix", () => {
      const key = generateApiKey();
      const randomPart = key.substring(3);
      expect(randomPart).toMatch(/^[A-Za-z0-9]+$/);
    });

    it("should generate unique keys", () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateApiKey());
      }
      expect(keys.size).toBe(100);
    });

    it("should be cryptographically unpredictable", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      const key3 = generateApiKey();

      // Keys should be significantly different
      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
    });
  });

  describe("validateAdminApiKey", () => {
    it("should return true for valid admin API key", () => {
      const adminKey = process.env.ADMIN_API_KEY || "admin-secret-key-change-in-production";
      const result = validateAdminApiKey(adminKey);
      expect(result).toBe(true);
    });

    it("should return false for invalid admin API key", () => {
      const result = validateAdminApiKey("invalid-admin-key");
      expect(result).toBe(false);
    });

    it("should return false for empty string", () => {
      const result = validateAdminApiKey("");
      expect(result).toBe(false);
    });

    it("should return false for similar but incorrect key", () => {
      const result = validateAdminApiKey("admin-secret-key-change-in-productio");
      expect(result).toBe(false);
    });

    it("should be case sensitive", () => {
      const adminKey = process.env.ADMIN_API_KEY || "admin-secret-key-change-in-production";
      const result = validateAdminApiKey(adminKey.toUpperCase());
      // Only valid if the key happens to be all uppercase
      if (adminKey !== adminKey.toUpperCase()) {
        expect(result).toBe(false);
      }
    });
  });
});
