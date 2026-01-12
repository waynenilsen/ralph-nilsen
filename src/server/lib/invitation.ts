import { randomUUID } from "crypto";

// Default invitation expiration: 7 days
const DEFAULT_EXPIRATION_DAYS = 7;

/**
 * Generate a new invitation token (UUID v4)
 */
export function generateInvitationToken(): string {
  return randomUUID();
}

/**
 * Calculate expiration date for an invitation
 * @param days Number of days until expiration (default: 7)
 * @returns Date object representing the expiration time
 */
export function calculateExpirationDate(days: number = DEFAULT_EXPIRATION_DAYS): Date {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate;
}

/**
 * Check if an invitation has expired
 * @param expiresAt The expiration date of the invitation
 * @returns true if expired, false otherwise
 */
export function isInvitationExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Get the number of days until an invitation expires
 * @param expiresAt The expiration date of the invitation
 * @returns Number of days (can be negative if expired)
 */
export function getDaysUntilExpiration(expiresAt: Date): number {
  const now = new Date();
  const expiration = new Date(expiresAt);
  const diffTime = expiration.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
