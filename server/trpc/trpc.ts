import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import type { TRPCContext } from "@/server/trpc/context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.reviewer) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Reviewer is not authenticated for this locale.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      reviewer: ctx.reviewer,
    },
  });
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
