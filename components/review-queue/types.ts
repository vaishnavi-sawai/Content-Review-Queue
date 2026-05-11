import { Locale, TicketStatus } from "@prisma/client";

export interface ReviewerSession {
  reviewerCode: string;
  locale: Locale;
}

export interface QueueTicket {
  id: string;
  title: string;
  description: string;
  locale: Locale;
  status: TicketStatus;
}

export interface QueueMetrics {
  locale: Locale;
  available: number;
  reserved: number;
  confirmed: number;
  released: number;
}
