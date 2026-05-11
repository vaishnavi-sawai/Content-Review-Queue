import { Locale } from "@prisma/client";
import { z } from "zod";

export const loginFormSchema = z.object({
  reviewerCode: z.string().min(3, "Reviewer ID must be at least 3 characters."),
  locale: z.nativeEnum(Locale),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
