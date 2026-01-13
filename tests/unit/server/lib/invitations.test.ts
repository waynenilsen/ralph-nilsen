/**
 * Unit tests for invitation utility functions.
 *
 * Tests token generation, expiration calculation, and helper functions.
 */

import { describe, it, expect } from "bun:test";
import {
  generateInvitationToken,
  calculateExpirationDate,
  isInvitationExpired,
  getDaysUntilExpiration,
} from "@/server/lib/invitation";

describe("Invitation Token Generation", () => {
  it("should generate a valid UUID token", () => {
    const token = generateInvitationToken();

    // UUID v4 format: 8-4-4-4-12
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(token)).toBe(true);
  });

  it("should generate unique tokens", () => {
    const token1 = generateInvitationToken();
    const token2 = generateInvitationToken();

    expect(token1).not.toBe(token2);
  });

  it("should generate tokens of consistent length", () => {
    const token1 = generateInvitationToken();
    const token2 = generateInvitationToken();

    expect(token1.length).toBe(36); // UUID format length
    expect(token2.length).toBe(36);
  });
});

describe("Expiration Date Calculation", () => {
  it("should calculate expiration date 7 days from now by default", () => {
    const now = new Date();
    const expiresAt = calculateExpirationDate();

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 7);

    // Allow 1 second tolerance for test execution time
    const diff = Math.abs(expiresAt.getTime() - expectedDate.getTime());
    expect(diff).toBeLessThan(1000);
  });

  it("should calculate expiration date for custom number of days", () => {
    const now = new Date();
    const expiresAt = calculateExpirationDate(14);

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 14);

    const diff = Math.abs(expiresAt.getTime() - expectedDate.getTime());
    expect(diff).toBeLessThan(1000);
  });

  it("should handle single day expiration", () => {
    const now = new Date();
    const expiresAt = calculateExpirationDate(1);

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 1);

    const diff = Math.abs(expiresAt.getTime() - expectedDate.getTime());
    expect(diff).toBeLessThan(1000);
  });

  it("should return a Date object", () => {
    const result = calculateExpirationDate();
    expect(result instanceof Date).toBe(true);
  });
});

describe("Invitation Expiration Check", () => {
  it("should return false for future expiration date", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    expect(isInvitationExpired(futureDate)).toBe(false);
  });

  it("should return true for past expiration date", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    expect(isInvitationExpired(pastDate)).toBe(true);
  });

  it("should return true for current moment", () => {
    const now = new Date();
    // Set to a few milliseconds ago to ensure it's in the past
    now.setMilliseconds(now.getMilliseconds() - 100);

    expect(isInvitationExpired(now)).toBe(true);
  });

  it("should handle Date string input", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    // The function should work with Date objects created from strings
    expect(isInvitationExpired(new Date(futureDate.toISOString()))).toBe(false);
  });
});

describe("Days Until Expiration", () => {
  it("should return positive number for future dates", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const days = getDaysUntilExpiration(futureDate);
    expect(days).toBeGreaterThanOrEqual(7);
    expect(days).toBeLessThanOrEqual(8); // Account for rounding
  });

  it("should return negative number for past dates", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const days = getDaysUntilExpiration(pastDate);
    expect(days).toBeLessThanOrEqual(-2);
    expect(days).toBeGreaterThanOrEqual(-3);
  });

  it("should return 1 for tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const days = getDaysUntilExpiration(tomorrow);
    expect(days).toBe(1);
  });

  it("should return 0 or 1 for dates within 24 hours", () => {
    const soon = new Date();
    soon.setHours(soon.getHours() + 12);

    const days = getDaysUntilExpiration(soon);
    expect(days).toBeGreaterThanOrEqual(0);
    expect(days).toBeLessThanOrEqual(1);
  });

  it("should round up partial days", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    futureDate.setHours(futureDate.getHours() + 1); // Add 1 hour

    const days = getDaysUntilExpiration(futureDate);
    // Should round up to 3 days
    expect(days).toBe(3);
  });
});
