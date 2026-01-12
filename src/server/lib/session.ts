import bcrypt from "bcryptjs";
import { adminPool } from "@/server/db";
import type { User, UserPublic, Session, UserTenant, Tenant, UserOrganization } from "@/shared/types";

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
const SESSION_DURATION_DAYS = parseInt(process.env.SESSION_DURATION_DAYS || "30", 10);
const PASSWORD_RESET_EXPIRY_HOURS = parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS || "1", 10);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  const client = await adminPool.connect();
  try {
    const slug = generateSlug(baseName);
    let counter = 0;

    while (true) {
      const candidateSlug = counter === 0 ? slug : `${slug}-${counter}`;
      const { rows } = await client.query(
        "SELECT id FROM tenants WHERE slug = $1",
        [candidateSlug]
      );
      if (rows.length === 0) {
        return candidateSlug;
      }
      counter++;
    }
  } finally {
    client.release();
  }
}

export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    email_verified: user.email_verified,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<User>(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<User>(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

export async function findUserByEmailOrUsername(identifier: string): Promise<User | null> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<User>(
      "SELECT * FROM users WHERE email = $1 OR username = $1",
      [identifier.toLowerCase()]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

export async function findUserById(id: string): Promise<User | null> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<User>(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

export async function createUser(
  email: string,
  username: string,
  password: string
): Promise<{ user: User; tenant: Tenant; session: Session }> {
  const client = await adminPool.connect();
  try {
    await client.query("BEGIN");

    // Create user
    const passwordHash = await hashPassword(password);
    const { rows: users } = await client.query<User>(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3) RETURNING *`,
      [email.toLowerCase(), username, passwordHash]
    );
    const user = users[0]!;

    // Create default organization
    const orgName = `${username}'s Organization`;
    const slug = await generateUniqueSlug(orgName);
    const { rows: tenants } = await client.query<Tenant>(
      `INSERT INTO tenants (name, slug)
       VALUES ($1, $2) RETURNING *`,
      [orgName, slug]
    );
    const tenant = tenants[0]!;

    // Add user as owner of organization
    await client.query(
      `INSERT INTO user_tenants (user_id, tenant_id, role)
       VALUES ($1, $2, 'owner')`,
      [user.id, tenant.id]
    );

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const { rows: sessions } = await client.query<Session>(
      `INSERT INTO sessions (user_id, tenant_id, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [user.id, tenant.id, expiresAt]
    );
    const session = sessions[0]!;

    await client.query("COMMIT");
    return { user, tenant, session };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createSession(
  userId: string,
  tenantId: string | null
): Promise<Session> {
  const client = await adminPool.connect();
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const { rows } = await client.query<Session>(
      `INSERT INTO sessions (user_id, tenant_id, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, tenantId, expiresAt]
    );
    return rows[0]!;
  } finally {
    client.release();
  }
}

export async function validateSession(
  sessionToken: string
): Promise<{ user: User; session: Session; tenant: Tenant | null } | null> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<Session & { user_data: User; tenant_data: Tenant | null }>(
      `SELECT
        s.*,
        row_to_json(u.*) as user_data,
        CASE WHEN t.id IS NOT NULL THEN row_to_json(t.*) ELSE NULL END as tenant_data
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN tenants t ON t.id = s.tenant_id
       WHERE s.session_token = $1 AND s.expires_at > NOW()`,
      [sessionToken]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0]!;
    const user = row.user_data as User;
    const tenant = row.tenant_data as Tenant | null;
    const session: Session = {
      id: row.id,
      user_id: row.user_id,
      tenant_id: row.tenant_id,
      session_token: row.session_token,
      expires_at: row.expires_at,
      created_at: row.created_at,
    };

    return { user, session, tenant };
  } finally {
    client.release();
  }
}

export async function deleteSession(sessionToken: string): Promise<void> {
  const client = await adminPool.connect();
  try {
    await client.query(
      "DELETE FROM sessions WHERE session_token = $1",
      [sessionToken]
    );
  } finally {
    client.release();
  }
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  const client = await adminPool.connect();
  try {
    await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  } finally {
    client.release();
  }
}

export async function updateSessionTenant(
  sessionToken: string,
  tenantId: string
): Promise<Session | null> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<Session>(
      `UPDATE sessions SET tenant_id = $1
       WHERE session_token = $2 AND expires_at > NOW()
       RETURNING *`,
      [tenantId, sessionToken]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

export async function getUserOrganizations(userId: string): Promise<UserOrganization[]> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<UserTenant & { tenant_data: Tenant }>(
      `SELECT ut.*, row_to_json(t.*) as tenant_data
       FROM user_tenants ut
       JOIN tenants t ON t.id = ut.tenant_id
       WHERE ut.user_id = $1 AND t.is_active = true
       ORDER BY ut.created_at ASC`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      role: row.role,
      created_at: row.created_at,
      tenant: row.tenant_data as Tenant,
    }));
  } finally {
    client.release();
  }
}

export async function getUserDefaultOrganization(userId: string): Promise<Tenant | null> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<Tenant>(
      `SELECT t.*
       FROM user_tenants ut
       JOIN tenants t ON t.id = ut.tenant_id
       WHERE ut.user_id = $1 AND t.is_active = true
       ORDER BY ut.created_at ASC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

export async function userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query(
      `SELECT 1 FROM user_tenants ut
       JOIN tenants t ON t.id = ut.tenant_id
       WHERE ut.user_id = $1 AND ut.tenant_id = $2 AND t.is_active = true`,
      [userId, tenantId]
    );
    return rows.length > 0;
  } finally {
    client.release();
  }
}

export async function createOrganization(
  userId: string,
  name: string
): Promise<{ tenant: Tenant; userTenant: UserTenant }> {
  const client = await adminPool.connect();
  try {
    await client.query("BEGIN");

    const slug = await generateUniqueSlug(name);
    const { rows: tenants } = await client.query<Tenant>(
      `INSERT INTO tenants (name, slug)
       VALUES ($1, $2) RETURNING *`,
      [name, slug]
    );
    const tenant = tenants[0]!;

    const { rows: userTenants } = await client.query<UserTenant>(
      `INSERT INTO user_tenants (user_id, tenant_id, role)
       VALUES ($1, $2, 'owner') RETURNING *`,
      [userId, tenant.id]
    );
    const userTenant = userTenants[0]!;

    await client.query("COMMIT");
    return { tenant, userTenant };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const client = await adminPool.connect();
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);

    const { rows } = await client.query<{ token: string }>(
      `INSERT INTO password_reset_tokens (user_id, expires_at)
       VALUES ($1, $2) RETURNING token`,
      [userId, expiresAt]
    );
    return rows[0]!.token;
  } finally {
    client.release();
  }
}

export async function validatePasswordResetToken(
  token: string
): Promise<User | null> {
  const client = await adminPool.connect();
  try {
    const { rows } = await client.query<{ user_data: User }>(
      `SELECT row_to_json(u.*) as user_data
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1
         AND prt.expires_at > NOW()
         AND prt.used_at IS NULL`,
      [token]
    );
    return rows[0]?.user_data || null;
  } finally {
    client.release();
  }
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<boolean> {
  const client = await adminPool.connect();
  try {
    await client.query("BEGIN");

    // Get the user from the token
    const { rows: tokens } = await client.query<{ user_id: string }>(
      `SELECT user_id FROM password_reset_tokens
       WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token]
    );

    if (tokens.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const userId = tokens[0]!.user_id;

    // Hash and update password
    const passwordHash = await hashPassword(newPassword);
    await client.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [passwordHash, userId]
    );

    // Mark token as used
    await client.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1",
      [token]
    );

    // Invalidate all sessions
    await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
