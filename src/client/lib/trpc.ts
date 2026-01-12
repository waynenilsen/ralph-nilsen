import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/trpc/router";

export const trpc = createTRPCReact<AppRouter>();

export function getTRPCClient(apiKey?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        headers() {
          return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
        },
        transformer: superjson,
      }),
    ],
  });
}

export function getSessionTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
      }),
    ],
  });
}
