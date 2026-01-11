import { describe, it, expect } from "bun:test";
import { hashApiKey, compareApiKey, generateApiKey } from "@/server/lib/auth";

describe("Authentication Utilities", () => {
  describe("generateApiKey", () => {
    it("should generate a key with tk_ prefix", () => {
      const key = generateApiKey();
      expect(key.startsWith("tk_")).toBe(true);
    });

    it("should generate a key with correct length", () => {
      const key = generateApiKey();
      expect(key.length).toBe(35); // 3 prefix + 32 random
    });

    it("should generate unique keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("hashApiKey and compareApiKey", () => {
    it("should hash and verify API keys correctly", async () => {
      const apiKey = "tk_test_api_key_12345";
      const hash = await hashApiKey(apiKey);

      expect(hash).not.toBe(apiKey);
      expect(hash.startsWith("$2")).toBe(true);

      const isValid = await compareApiKey(apiKey, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect API keys", async () => {
      const apiKey = "tk_test_api_key_12345";
      const hash = await hashApiKey(apiKey);

      const isValid = await compareApiKey("tk_wrong_key", hash);
      expect(isValid).toBe(false);
    });
  });
});
