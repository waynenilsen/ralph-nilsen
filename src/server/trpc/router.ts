import { router, publicProcedure } from "./init";
import { tenantsRouter } from "./routers/tenants";
import { todosRouter } from "./routers/todos";
import { tagsRouter } from "./routers/tags";
import { checkDatabaseHealth } from "@/server/db";

export const appRouter = router({
  health: publicProcedure.query(async () => {
    const dbHealthy = await checkDatabaseHealth();
    return {
      status: dbHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: dbHealthy ? "connected" : "disconnected",
    };
  }),

  tenants: tenantsRouter,
  todos: todosRouter,
  tags: tagsRouter,
});

export type AppRouter = typeof appRouter;
