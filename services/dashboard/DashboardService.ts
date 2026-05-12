import "server-only";

import { Prisma, ReservationStatus, TicketStatus, type Locale, type PrismaClient } from "@prisma/client";

import { RESERVATION_WINDOW_MS } from "@/services/review-queue/constants";
import { releaseExpiredReservations } from "@/services/review-queue/releaseExpiredReservations";

import { DashboardDomainError } from "./DashboardDomainError";

/** Bundlers may resolve two `@prisma/client` copies, so `instanceof PrismaClientKnownRequestError` can be false. */
function isPrismaClientKnownRequestErrorLike(
  error: unknown,
): error is Pick<Prisma.PrismaClientKnownRequestError, "code" | "name"> {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "PrismaClientKnownRequestError" &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

/** Prisma 7 + engine adapter reports PG deadlocks as `DriverAdapterError` (SQLSTATE 40P01), not `PrismaClientKnownRequestError`. */
function isPostgresConcurrencyAdapterError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const ctor = (error as { constructor?: { name?: string } }).constructor?.name;
  if (ctor !== "DriverAdapterError") {
    return false;
  }
  const cause = (error as { cause?: { originalCode?: unknown; code?: unknown } }).cause;
  const code =
    typeof cause?.originalCode === "string"
      ? cause.originalCode
      : typeof cause?.code === "string"
        ? cause.code
        : undefined;
  return code === "40P01" || code === "40001";
}

export class DashboardService {
  constructor(private readonly db: PrismaClient) {}

  async getAvailableTickets(locale: Locale) {
    const now = new Date();
    await releaseExpiredReservations(this.db, now);

    return this.db.ticket.findMany({
      where: {
        locale,
        status: TicketStatus.AVAILABLE,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async reserveTicket(params: {
    locale: Locale;
    reviewerId: string;
    ticketId: string;
  }) {
    const { locale, reviewerId, ticketId } = params;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_WINDOW_MS);

    try {
      const result = await this.db.$transaction(async (tx) => {
        await releaseExpiredReservations(tx, now);

        await tx.$queryRaw(Prisma.sql`
          SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE
        `);

        const ticket = await tx.ticket.findUnique({
          where: { id: ticketId },
          select: { id: true, locale: true, status: true, currentReservationId: true },
        });

        if (!ticket || ticket.locale !== locale) {
          throw new DashboardDomainError(
            "NOT_FOUND",
            "Ticket is not available in your locale.",
          );
        }

        if (ticket.status !== TicketStatus.AVAILABLE || ticket.currentReservationId) {
          throw new DashboardDomainError(
            "CONFLICT",
            "Ticket is already reserved by another reviewer.",
          );
        }

        const reservation = await tx.reservation.create({
          data: {
            ticketId: ticket.id,
            reviewerId,
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
          throw new DashboardDomainError(
            "CONFLICT",
            "Ticket was reserved concurrently. Try another one.",
          );
        }

        return {
          reservationId: reservation.id,
          ticketId: ticket.id,
          expiresAt,
        };
      });
      return {
        reservationId: result.reservationId,
        ticketId: result.ticketId,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      if (error instanceof DashboardDomainError) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError ||
        isPrismaClientKnownRequestErrorLike(error) ||
        isPostgresConcurrencyAdapterError(error)
      ) {
        throw new DashboardDomainError(
          "CONFLICT",
          "Failed to reserve ticket due to concurrent write.",
        );
      }

      throw new DashboardDomainError(
        "INTERNAL_SERVER_ERROR",
        "Unable to reserve ticket right now.",
      );
    }
  }

  async confirmTicket(params: { locale: Locale; reviewerId: string; ticketId: string }) {
    const { locale, reviewerId, ticketId } = params;
    const now = new Date();

    const result = await this.db.$transaction(async (tx) => {
      await releaseExpiredReservations(tx, now);

      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: {
          currentReservation: true,
        },
      });

      if (!ticket || ticket.locale !== locale) {
        throw new DashboardDomainError("NOT_FOUND", "Ticket not found in your locale.");
      }

      if (!ticket.currentReservationId || !ticket.currentReservation) {
        throw new DashboardDomainError(
          "CONFLICT",
          "Ticket does not have an active reservation.",
        );
      }

      if (ticket.currentReservation.reviewerId !== reviewerId) {
        throw new DashboardDomainError(
          "FORBIDDEN",
          "This reservation belongs to another reviewer.",
        );
      }

      if (
        ticket.currentReservation.status !== ReservationStatus.ACTIVE ||
        ticket.currentReservation.expiresAt <= now
      ) {
        throw new DashboardDomainError(
          "CONFLICT",
          "Reservation has expired and was released.",
        );
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
    return {
      ticketId: result.ticketId,
      status: result.status,
    };
  }

  async getActiveReservations(params: { locale: Locale; reviewerId: string }) {
    const { locale, reviewerId } = params;
    const now = new Date();
    await releaseExpiredReservations(this.db, now);

    const tickets = await this.db.ticket.findMany({
      where: {
        locale,
        status: TicketStatus.RESERVED,
        currentReservation: {
          reviewerId,
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
  }

  async getMetrics(locale: Locale) {
    const now = new Date();
    await releaseExpiredReservations(this.db, now);

    const [available, reserved, confirmed, released] = await Promise.all([
      this.db.ticket.count({
        where: { locale, status: TicketStatus.AVAILABLE },
      }),
      this.db.ticket.count({
        where: { locale, status: TicketStatus.RESERVED },
      }),
      this.db.ticket.count({
        where: { locale, status: TicketStatus.CONFIRMED },
      }),
      this.db.reservation.count({
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
  }
}
