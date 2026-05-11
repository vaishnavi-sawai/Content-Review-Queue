import { Prisma, ReservationStatus, TicketStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { RESERVATION_WINDOW_MS } from "@/services/review-queue/constants";
import { releaseExpiredReservations } from "@/services/review-queue/releaseExpiredReservations";
import {
  authenticateReviewerSchema,
  ticketIdSchema,
} from "@/server/trpc/routers/reviewQueue.schemas";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc/trpc";

export const reviewQueueRouter = createTRPCRouter({
  authenticate: publicProcedure
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
    }),

  availableTickets: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    await releaseExpiredReservations(ctx.prisma, now);

    return ctx.prisma.ticket.findMany({
      where: {
        locale: ctx.reviewer.locale,
        status: TicketStatus.AVAILABLE,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }),

  reserveTicket: protectedProcedure
    .input(ticketIdSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + RESERVATION_WINDOW_MS);

      try {
        return await ctx.prisma.$transaction(async (tx) => {
          await releaseExpiredReservations(tx, now);

          const ticket = await tx.ticket.findUnique({
            where: { id: input.ticketId },
            select: { id: true, locale: true, status: true, currentReservationId: true },
          });

          if (!ticket || ticket.locale !== ctx.reviewer.locale) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Ticket is not available in your locale.",
            });
          }

          if (ticket.status !== TicketStatus.AVAILABLE || ticket.currentReservationId) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Ticket is already reserved by another reviewer.",
            });
          }

          const reservation = await tx.reservation.create({
            data: {
              ticketId: ticket.id,
              reviewerId: ctx.reviewer.id,
              expiresAt,
            },
          });

          const ticketUpdate = await tx.ticket.updateMany({
            where: {
              id: ticket.id,
              status: TicketStatus.AVAILABLE,
              currentReservationId: null,
            },
            data: {
              status: TicketStatus.RESERVED,
              currentReservationId: reservation.id,
              reservationExpiresAt: expiresAt,
            },
          });

          if (ticketUpdate.count === 0) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Ticket was reserved concurrently. Try another one.",
            });
          }

          return {
            reservationId: reservation.id,
            ticketId: ticket.id,
            expiresAt,
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Failed to reserve ticket due to concurrent write.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to reserve ticket right now.",
        });
      }
    }),

  confirmTicket: protectedProcedure
    .input(ticketIdSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      return ctx.prisma.$transaction(async (tx) => {
        await releaseExpiredReservations(tx, now);

        const ticket = await tx.ticket.findUnique({
          where: { id: input.ticketId },
          include: {
            currentReservation: true,
          },
        });

        if (!ticket || ticket.locale !== ctx.reviewer.locale) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Ticket not found in your locale.",
          });
        }

        if (!ticket.currentReservationId || !ticket.currentReservation) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ticket does not have an active reservation.",
          });
        }

        if (ticket.currentReservation.reviewerId !== ctx.reviewer.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This reservation belongs to another reviewer.",
          });
        }

        if (
          ticket.currentReservation.status !== ReservationStatus.ACTIVE ||
          ticket.currentReservation.expiresAt <= now
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Reservation has expired and was released.",
          });
        }

        await tx.reservation.update({
          where: { id: ticket.currentReservation.id },
          data: {
            status: ReservationStatus.CONFIRMED,
            confirmedAt: now,
          },
        });

        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            status: TicketStatus.CONFIRMED,
            reservationExpiresAt: null,
          },
        });

        return {
          ticketId: ticket.id,
          status: TicketStatus.CONFIRMED,
        };
      });
    }),

  activeReservations: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    await releaseExpiredReservations(ctx.prisma, now);

    const tickets = await ctx.prisma.ticket.findMany({
      where: {
        locale: ctx.reviewer.locale,
        status: TicketStatus.RESERVED,
        currentReservation: {
          reviewerId: ctx.reviewer.id,
          status: ReservationStatus.ACTIVE,
        },
      },
      include: {
        currentReservation: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return tickets.flatMap((ticket) => {
      if (!ticket.currentReservation) {
        return [];
      }

      return [
        {
          ticket,
          reservation: ticket.currentReservation,
        },
      ];
    });
  }),

  metrics: protectedProcedure.query(async ({ ctx }) => {
    const locale = ctx.reviewer.locale;
    const now = new Date();
    await releaseExpiredReservations(ctx.prisma, now);

    const [available, reserved, confirmed, released] = await Promise.all([
      ctx.prisma.ticket.count({
        where: { locale, status: TicketStatus.AVAILABLE },
      }),
      ctx.prisma.ticket.count({
        where: { locale, status: TicketStatus.RESERVED },
      }),
      ctx.prisma.ticket.count({
        where: { locale, status: TicketStatus.CONFIRMED },
      }),
      ctx.prisma.reservation.count({
        where: {
          ticket: { locale },
          status: ReservationStatus.RELEASED,
        },
      }),
    ]);

    return {
      locale,
      available,
      reserved,
      confirmed,
      released,
    };
  }),
});
