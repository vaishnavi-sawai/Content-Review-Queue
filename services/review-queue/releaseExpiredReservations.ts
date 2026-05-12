import {
  Prisma,
  PrismaClient,
  ReservationStatus,
  TicketStatus,
  type Locale,
} from "@prisma/client";

export type ReleaseExpiredReservationsResult = {
  releasedCount: number;
  /** Locales whose queues may have changed (tickets re-queued or touched). */
  affectedLocales: Locale[];
};

type PrismaLikeClient = PrismaClient | Prisma.TransactionClient;

function isPrismaClient(client: PrismaLikeClient): client is PrismaClient {
  return typeof (client as PrismaClient).$transaction === "function";
}

async function releaseExpiredReservationsTx(
  tx: Prisma.TransactionClient,
  now: Date,
): Promise<ReleaseExpiredReservationsResult> {
  const expiredReservations = await tx.reservation.findMany({
    where: {
      status: ReservationStatus.ACTIVE,
      expiresAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      ticketId: true,
    },
  });

  if (expiredReservations.length === 0) {
    return { releasedCount: 0, affectedLocales: [] };
  }

  const reservationIds = expiredReservations.map((reservation) => reservation.id);
  const ticketIds = [...new Set(expiredReservations.map((reservation) => reservation.ticketId))];

  const ticketsForLocales = await tx.ticket.findMany({
    where: { id: { in: ticketIds } },
    select: { locale: true },
  });
  const affectedLocales = [...new Set(ticketsForLocales.map((row) => row.locale))];

  await tx.reservation.updateMany({
    where: {
      id: { in: reservationIds },
      status: ReservationStatus.ACTIVE,
    },
    data: {
      status: ReservationStatus.RELEASED,
      releasedAt: now,
    },
  });

  await tx.ticket.updateMany({
    where: {
      id: { in: ticketIds },
      status: TicketStatus.RESERVED,
      currentReservationId: { in: reservationIds },
      reservationExpiresAt: { lte: now },
    },
    data: {
      status: TicketStatus.AVAILABLE,
      currentReservationId: null,
      reservationExpiresAt: null,
    },
  });

  return { releasedCount: reservationIds.length, affectedLocales };
}

/** When `client` is a root {@link PrismaClient}, reservation and ticket updates run in one DB transaction. When `client` is already a {@link Prisma.TransactionClient}, runs in that outer transaction (no nested `$transaction`). */
export async function releaseExpiredReservations(
  client: PrismaLikeClient,
  now: Date,
): Promise<ReleaseExpiredReservationsResult> {
  if (isPrismaClient(client)) {
    return client.$transaction((tx) => releaseExpiredReservationsTx(tx, now));
  }
  return releaseExpiredReservationsTx(client, now);
}
