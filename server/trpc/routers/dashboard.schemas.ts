import { z } from "zod";

export const ticketIdSchema = z.object({
  ticketId: z.string().min(1),
});
