import { Locale } from "@prisma/client";
import { z } from "zod";

export const authenticateReviewerSchema = z.object({
  reviewerCode: z.string().min(3),
  locale: z.nativeEnum(Locale),
});

export const ticketIdSchema = z.object({
  ticketId: z.string().min(1),
});
