import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "@/server/trpc/routers/_app";
import { createTRPCContext } from "@/server/trpc/context";

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createTRPCContext({ req: request }),
  });

export { handler as GET, handler as POST };
