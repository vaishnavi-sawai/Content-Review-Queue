"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";

import { trpc } from "@/server/trpc/client";

interface TrpcProviderProps {
  children: React.ReactNode;
  reviewerCode: string | null;
  locale: string | null;
}

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function TrpcProvider({ children, reviewerCode, locale }: TrpcProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            if (!reviewerCode || !locale) {
              return {};
            }

            return {
              "x-reviewer-id": reviewerCode,
              "x-reviewer-locale": locale,
            };
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
