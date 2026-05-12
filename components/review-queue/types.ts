import type { Locale } from "@prisma/client";

export interface ReviewerSession {
  reviewerCode: string;
  locale: Locale;
}

/** Shapes used by the review-queue UI (API rows may include more fields). */
export interface QueueTicket {
  id: string;
  title: string;
  description: string;
}

export interface QueueMetrics {
  available: number;
  reserved: number;
  confirmed: number;
  released: number;
}
