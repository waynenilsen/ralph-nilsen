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
