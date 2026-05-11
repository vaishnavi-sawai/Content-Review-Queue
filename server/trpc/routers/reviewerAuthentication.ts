import { Locale } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "@/server/trpc/trpc";

const authenticateReviewerSchema = z.object({
  reviewerCode: z.string().min(3),
  locale: z.nativeEnum(Locale),
});

export const authenticateReviewerProcedure = publicProcedure
  .input(authenticateReviewerSchema)
  .mutation(async ({ ctx, input }) => {
    const reviewer = await ctx.prisma.reviewer.findFirst({
      where: {
        reviewerCode: input.reviewerCode,
        locale: input.locale,
      },
    });

    if (!reviewer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Reviewer not found for selected locale.",
      });
    }

    return {
      reviewerCode: reviewer.reviewerCode,
      locale: reviewer.locale,
    };
  });
