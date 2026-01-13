import { router, publicProcedure } from "./init";
import { tenantsRouter } from "./routers/tenants";
import { todosRouter } from "./routers/todos";
import { tagsRouter } from "./routers/tags";
import { authRouter } from "./routers/auth";
import { organizationsRouter } from "./routers/organizations";
import { invitationsRouter } from "./routers/invitations";
import { usersRouter } from "./routers/users";
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

  auth: authRouter,
  organizations: organizationsRouter,
  invitations: invitationsRouter,
  tenants: tenantsRouter,
  todos: todosRouter,
  tags: tagsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
