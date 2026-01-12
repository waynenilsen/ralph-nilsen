import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  getTestPool,
  closeTestPool,
  withTestClient,
  cleanupTestData,
  createTestTenant,
  setTenantContext,
  resetTenantContext,
} from "../helpers/setup";

describe("Row-Level Security", () => {
  beforeAll(() => {
    getTestPool();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await withTestClient(cleanupTestData);
  });

  it("should isolate todos between tenants", async () => {
    await withTestClient(async (client) => {
      const tenantAId = await createTestTenant(client, "test-tenant-a");
      const tenantBId = await createTestTenant(client, "test-tenant-b");

      await setTenantContext(client, tenantAId);
      await client.query("INSERT INTO todos (tenant_id, title) VALUES ($1, $2)", [
        tenantAId,
        "Tenant A Todo",
      ]);

      await setTenantContext(client, tenantBId);
      await client.query("INSERT INTO todos (tenant_id, title) VALUES ($1, $2)", [
        tenantBId,
        "Tenant B Todo",
      ]);

      await setTenantContext(client, tenantAId);
      const { rows: tenantATodos } = await client.query("SELECT * FROM todos");
      expect(tenantATodos).toHaveLength(1);
      expect(tenantATodos[0].title).toBe("Tenant A Todo");

      await setTenantContext(client, tenantBId);
      const { rows: tenantBTodos } = await client.query("SELECT * FROM todos");
      expect(tenantBTodos).toHaveLength(1);
      expect(tenantBTodos[0].title).toBe("Tenant B Todo");

      await resetTenantContext(client);
    });
  });

  it("should prevent cross-tenant writes", async () => {
    await withTestClient(async (client) => {
      const tenantAId = await createTestTenant(client, "test-write-a");
      const tenantBId = await createTestTenant(client, "test-write-b");

      await setTenantContext(client, tenantAId);
      const { rows } = await client.query(
        "INSERT INTO todos (tenant_id, title) VALUES ($1, $2) RETURNING id",
        [tenantAId, "Tenant A Todo"]
      );
      const todoId = rows[0].id;

      await setTenantContext(client, tenantBId);
      const { rowCount } = await client.query("UPDATE todos SET title = $1 WHERE id = $2", [
        "Hacked!",
        todoId,
      ]);
      expect(rowCount).toBe(0);

      await setTenantContext(client, tenantAId);
      const { rows: check } = await client.query("SELECT title FROM todos WHERE id = $1", [todoId]);
      expect(check[0].title).toBe("Tenant A Todo");

      await resetTenantContext(client);
    });
  });
});
