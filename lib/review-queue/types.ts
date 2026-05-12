import type { Locale } from "@prisma/client";

export interface ParsedReviewerSession {
  reviewerCode: string;
  locale: Locale;
}
