import { db } from "../db";
import type { TodoAssignee } from "../../shared/types";

/**
 * Validates that a user is a member of the given organization
 */
export async function isUserInOrganization(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM user_tenants WHERE user_id = $1 AND tenant_id = $2 LIMIT 1`,
    [userId, tenantId]
  );
  return result.rows.length > 0;
}

/**
 * Validates that all users in the array are members of the given organization
 */
export async function validateUsersInOrganization(
  userIds: string[],
  tenantId: string
): Promise<{ valid: boolean; invalidUserIds: string[] }> {
  if (userIds.length === 0) {
    return { valid: true, invalidUserIds: [] };
  }

  const result = await db.query(
    `SELECT user_id FROM user_tenants WHERE user_id = ANY($1) AND tenant_id = $2`,
    [userIds, tenantId]
  );

  const validUserIds = new Set(result.rows.map((row) => row.user_id));
  const invalidUserIds = userIds.filter((id) => !validUserIds.has(id));

  return {
    valid: invalidUserIds.length === 0,
    invalidUserIds,
  };
}

/**
 * Checks if a user can unassign another user from a todo
 * User can unassign if:
 * - They are unassigning themselves
 * - They are the one who assigned the user
 * - They are the todo creator (owner)
 */
export async function canUnassignUser(
  currentUserId: string,
  todoId: string,
  userIdToUnassign: string
): Promise<boolean> {
  // Can always unassign yourself
  if (currentUserId === userIdToUnassign) {
    return true;
  }

  const result = await db.query(
    `SELECT
      t.created_by,
      ta.assigned_by
     FROM todos t
     LEFT JOIN todo_assignments ta ON ta.todo_id = t.id AND ta.user_id = $3
     WHERE t.id = $1
     LIMIT 1`,
    [todoId, currentUserId, userIdToUnassign]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const { created_by, assigned_by } = result.rows[0];

  // Can unassign if you're the todo creator or the one who assigned them
  return created_by === currentUserId || assigned_by === currentUserId;
}

/**
 * Gets all assignees for a todo with their user information
 */
export async function getTodoAssignees(
  todoId: string
): Promise<TodoAssignee[]> {
  const result = await db.query(
    `SELECT
      u.id,
      u.email,
      u.username,
      ta.assigned_by,
      ta.assigned_at
     FROM todo_assignments ta
     JOIN users u ON u.id = ta.user_id
     WHERE ta.todo_id = $1
     ORDER BY ta.assigned_at ASC`,
    [todoId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    username: row.username,
    assigned_by: row.assigned_by,
    assigned_at: row.assigned_at,
  }));
}

/**
 * Checks if a todo is assigned to a specific user
 */
export async function isTodoAssignedToUser(
  todoId: string,
  userId: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM todo_assignments WHERE todo_id = $1 AND user_id = $2 LIMIT 1`,
    [todoId, userId]
  );
  return result.rows.length > 0;
}
