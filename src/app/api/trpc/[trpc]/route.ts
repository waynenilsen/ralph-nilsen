import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/router";
import type { Context } from "@/server/trpc/init";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: (): Context => ({
      tenant: null,
      apiKey: null,
      isAdmin: false,
      headers: req.headers,
    }),
    onError({ error, path }) {
      console.error(`tRPC error on ${path}:`, error);
    },
  });

export { handler as GET, handler as POST };
