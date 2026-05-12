import { TRPCError } from "@trpc/server";

import { DashboardDomainError } from "@/services/dashboard/DashboardDomainError";
import { DashboardService } from "@/services/dashboard/DashboardService";
import { ticketIdSchema } from "@/server/trpc/routers/dashboard.schemas";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

function throwTrpcFromDashboard(error: unknown): never {
  if (error instanceof DashboardDomainError) {
    throw new TRPCError({ code: error.trpcCode, message: error.message });
  }
  throw error;
}

export const dashboardRouter = createTRPCRouter({
  availableTickets: protectedProcedure.query(async ({ ctx }) => {
    const service = new DashboardService(ctx.prisma);
    return service.getAvailableTickets(ctx.reviewer.locale);
  }),

  reserveTicket: protectedProcedure
    .input(ticketIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new DashboardService(ctx.prisma);
      try {
        return await service.reserveTicket({
          locale: ctx.reviewer.locale,
          reviewerId: ctx.reviewer.id,
          ticketId: input.ticketId,
        });
      } catch (error) {
        throwTrpcFromDashboard(error);
      }
    }),

  confirmTicket: protectedProcedure
    .input(ticketIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new DashboardService(ctx.prisma);
      try {
        return await service.confirmTicket({
          locale: ctx.reviewer.locale,
          reviewerId: ctx.reviewer.id,
          ticketId: input.ticketId,
        });
      } catch (error) {
        throwTrpcFromDashboard(error);
      }
    }),

  activeReservations: protectedProcedure.query(async ({ ctx }) => {
    const service = new DashboardService(ctx.prisma);
    return service.getActiveReservations({
      locale: ctx.reviewer.locale,
      reviewerId: ctx.reviewer.id,
    });
  }),

  metrics: protectedProcedure.query(async ({ ctx }) => {
    const service = new DashboardService(ctx.prisma);
    return service.getMetrics(ctx.reviewer.locale);
  }),
});
