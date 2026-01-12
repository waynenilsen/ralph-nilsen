/**
 * MailHog helpers for testing email functionality.
 *
 * MailHog is a local email testing tool that captures all outgoing emails.
 * These helpers interact with the MailHog HTTP API to verify emails in tests.
 */

const MAILHOG_API_URL = process.env.MAILHOG_API_URL || "http://localhost:40080/api/v1";
const MAILHOG_TIMEOUT = 5000; // 5 seconds

/**
 * Email message from MailHog API.
 */
export interface MailHogMessage {
  ID: string;
  From: {
    Relays: null;
    Mailbox: string;
    Domain: string;
    Params: string;
  };
  To: Array<{
    Relays: null;
    Mailbox: string;
    Domain: string;
    Params: string;
  }>;
  Content: {
    Headers: {
      Subject?: string[];
      From?: string[];
      To?: string[];
      "Content-Type"?: string[];
      [key: string]: string[] | undefined;
    };
    Body: string;
    Size: number;
    MIME: null | unknown;
  };
  Created: string;
  Raw: {
    From: string;
    To: string[];
    Data: string;
    Helo: string;
  };
}

/**
 * MailHog API response for messages.
 */
export interface MailHogResponse {
  total: number;
  count: number;
  start: number;
  items: MailHogMessage[];
}

/**
 * Check if MailHog is available.
 */
export async function checkMailHogConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${MAILHOG_API_URL}/messages?limit=1`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch all emails from MailHog.
 */
export async function getMailHogEmails(limit: number = 50): Promise<MailHogMessage[]> {
  try {
    const response = await fetch(`${MAILHOG_API_URL}/messages?limit=${limit}`, {
      signal: AbortSignal.timeout(MAILHOG_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`MailHog API error: ${response.status}`);
    }

    const data: MailHogResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch MailHog emails:", error);
    return [];
  }
}

/**
 * Find emails sent to a specific address.
 */
export async function getEmailsTo(email: string): Promise<MailHogMessage[]> {
  const allEmails = await getMailHogEmails();
  const [mailbox, domain] = email.toLowerCase().split("@");

  return allEmails.filter((msg) =>
    msg.To.some(
      (to) =>
        to.Mailbox.toLowerCase() === mailbox &&
        to.Domain.toLowerCase() === domain
    )
  );
}

/**
 * Find the most recent email sent to an address.
 */
export async function getLatestEmailTo(email: string): Promise<MailHogMessage | null> {
  const emails = await getEmailsTo(email);
  return emails[0] ?? null;
}

/**
 * Wait for an email to arrive for a specific recipient.
 * Polls MailHog until the email is found or timeout.
 */
export async function waitForEmail(
  email: string,
  options: {
    timeout?: number;
    pollInterval?: number;
    subjectContains?: string;
  } = {}
): Promise<MailHogMessage | null> {
  const timeout = options.timeout || 10000;
  const pollInterval = options.pollInterval || 500;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const emails = await getEmailsTo(email);

    if (emails.length > 0) {
      if (options.subjectContains) {
        const matching = emails.find((msg) =>
          msg.Content.Headers.Subject?.some((subject) =>
            subject.toLowerCase().includes(options.subjectContains!.toLowerCase())
          )
        );
        if (matching) return matching;
      } else {
        return emails[0];
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return null;
}

/**
 * Get the subject of an email.
 */
export function getEmailSubject(message: MailHogMessage): string {
  return message.Content.Headers.Subject?.[0] || "";
}

/**
 * Get the plain text body of an email.
 */
export function getEmailBody(message: MailHogMessage): string {
  return message.Content.Body || "";
}

/**
 * Get the raw email data.
 */
export function getEmailRawData(message: MailHogMessage): string {
  return message.Raw.Data || "";
}

/**
 * Extract a password reset token from an email body.
 * Looks for URLs containing /reset-password/ and extracts the token.
 */
export function extractResetToken(message: MailHogMessage): string | null {
  const body = getEmailRawData(message);

  // Look for reset URL pattern
  const resetUrlPattern = /\/reset-password\/([a-zA-Z0-9_-]+)/;
  const match = body.match(resetUrlPattern);

  if (match && match[1]) {
    return match[1];
  }

  // Alternative: look for token directly
  const tokenPattern = /reset_[a-zA-Z0-9_-]+/;
  const tokenMatch = body.match(tokenPattern);

  return tokenMatch ? tokenMatch[0] : null;
}

/**
 * Extract a verification token from an email body.
 */
export function extractVerificationToken(message: MailHogMessage): string | null {
  const body = getEmailRawData(message);

  const verifyUrlPattern = /\/verify\/([a-zA-Z0-9_-]+)/;
  const match = body.match(verifyUrlPattern);

  return match ? match[1] : null;
}

/**
 * Clear all emails from MailHog.
 * Useful for test cleanup between test suites.
 */
export async function clearMailHogEmails(): Promise<boolean> {
  try {
    const response = await fetch(`${MAILHOG_API_URL}/messages`, {
      method: "DELETE",
      signal: AbortSignal.timeout(MAILHOG_TIMEOUT),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete a specific email by ID.
 */
export async function deleteEmail(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${MAILHOG_API_URL}/messages/${id}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(MAILHOG_TIMEOUT),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Assert that an email was received.
 * Throws an error if no email is found within the timeout.
 */
export async function assertEmailReceived(
  email: string,
  options: {
    timeout?: number;
    subjectContains?: string;
    bodyContains?: string;
  } = {}
): Promise<MailHogMessage> {
  const message = await waitForEmail(email, {
    timeout: options.timeout,
    subjectContains: options.subjectContains,
  });

  if (!message) {
    throw new Error(`No email received for ${email} within timeout`);
  }

  if (options.bodyContains) {
    const body = getEmailRawData(message);
    if (!body.includes(options.bodyContains)) {
      throw new Error(
        `Email body does not contain expected text: ${options.bodyContains}`
      );
    }
  }

  return message;
}

/**
 * Assert that no email was received (useful for testing error cases).
 */
export async function assertNoEmailReceived(
  email: string,
  waitMs: number = 2000
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const emails = await getEmailsTo(email);

  if (emails.length > 0) {
    throw new Error(`Unexpected email received for ${email}`);
  }
}
