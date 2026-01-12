"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, getSessionTRPCClient } from "@/client/lib/trpc";

interface TRPCSessionProviderProps {
  children: React.ReactNode;
}

export function TRPCSessionProvider({ children }: TRPCSessionProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5000, refetchOnWindowFocus: false },
        },
      })
  );

  const [trpcClient] = useState(() => getSessionTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
