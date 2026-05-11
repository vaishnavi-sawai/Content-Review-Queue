import { authenticateReviewerProcedure } from "@/server/trpc/routers/reviewerAuthentication";
import { createTRPCRouter } from "@/server/trpc/trpc";

export const reviewerAuthRouter = createTRPCRouter({
  authenticate: authenticateReviewerProcedure,
});
