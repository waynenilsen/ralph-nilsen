import { z } from "zod";

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>;

// Todo types
export type TodoStatus = "pending" | "completed";
export type TodoPriority = "low" | "medium" | "high";

export interface Todo {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
  tags?: Tag[];
}

export const CreateTodoSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  status: z.enum(["pending", "completed"]).default("pending"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.string().datetime().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export const UpdateTodoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["pending", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  due_date: z.string().datetime().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;

// Tag types
export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  created_at: Date;
}

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export const UpdateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;

// API Key types
export interface ApiKey {
  id: string;
  tenant_id: string;
  user_id: string | null;
  key_hash: string;
  name: string | null;
  last_used_at: Date | null;
  created_at: Date;
  expires_at: Date | null;
  is_active: boolean;
}

// Query params for listing todos
export const TodoQuerySchema = z.object({
  status: z.enum(["pending", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  tag: z.string().uuid().optional(),
  due_before: z.string().datetime().optional(),
  due_after: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type TodoQuery = z.infer<typeof TodoQuerySchema>;

// Pagination
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  username: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export type UserRole = "owner" | "member" | "admin";

export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role: UserRole;
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  tenant_id: string | null;
  session_token: string;
  expires_at: Date;
  created_at: Date;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

// Auth schemas
export const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  password: z.string()
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupInput = z.infer<typeof SignupSchema>;

export const SigninSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type SigninInput = z.infer<typeof SigninSchema>;

export const RequestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().uuid("Invalid token"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// Organization schemas
export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const SwitchOrganizationSchema = z.object({
  tenantId: z.string().uuid(),
});

export type SwitchOrganizationInput = z.infer<typeof SwitchOrganizationSchema>;

// User organization with tenant details
export interface UserOrganization {
  id: string;
  tenant_id: string;
  role: UserRole;
  created_at: Date;
  tenant: Tenant;
}
