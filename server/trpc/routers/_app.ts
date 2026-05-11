import { createTRPCRouter } from "@/server/trpc/trpc";
import { dashboardRouter } from "./dashboard";
import { reviewerAuthRouter } from "./reviewerAuth";

export const appRouter = createTRPCRouter({
  reviewerAuth: reviewerAuthRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
