import { createTRPCRouter } from "@/server/trpc/trpc";
import { reviewQueueRouter } from "@/server/trpc/routers/reviewQueue";

export const appRouter = createTRPCRouter({
  reviewQueue: reviewQueueRouter,
});

export type AppRouter = typeof appRouter;
