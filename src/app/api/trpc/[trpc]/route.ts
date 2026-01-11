import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { cookies } from "next/headers";
import { appRouter } from "@/server/trpc/router";
import type { Context } from "@/server/trpc/init";

const handler = async (req: Request) => {
  const cookieStore = await cookies();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: (): Context => ({
      tenant: null,
      apiKey: null,
      user: null,
      session: null,
      isAdmin: false,
      headers: req.headers,
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }),
    onError({ error, path }) {
      console.error(`tRPC error on ${path}:`, error);
    },
  });
};

export { handler as GET, handler as POST };
