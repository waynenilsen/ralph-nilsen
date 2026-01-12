import { describe, it, expect } from "bun:test";
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  CreateTagSchema,
  TodoQuerySchema,
} from "@/shared/types";

describe("Zod Schemas", () => {
  describe("CreateTodoSchema", () => {
    it("should validate valid todo", () => {
      const result = CreateTodoSchema.safeParse({
        title: "Test Todo",
        description: "Description",
        priority: "high",
        status: "pending",
      });
      expect(result.success).toBe(true);
    });

    it("should require title", () => {
      const result = CreateTodoSchema.safeParse({
        description: "No title",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty title", () => {
      const result = CreateTodoSchema.safeParse({
        title: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CreateTagSchema", () => {
    it("should validate valid tag", () => {
      const result = CreateTagSchema.safeParse({
        name: "Work",
        color: "#ff0000",
      });
      expect(result.success).toBe(true);
    });

    it("should require name", () => {
      const result = CreateTagSchema.safeParse({
        color: "#ff0000",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("TodoQuerySchema", () => {
    it("should provide defaults", () => {
      const result = TodoQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should coerce string numbers", () => {
      const result = TodoQuerySchema.parse({
        page: "5",
        limit: "50",
      });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });
  });
});
