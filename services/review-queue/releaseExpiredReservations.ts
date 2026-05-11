import {
  Prisma,
  ReservationStatus,
  TicketStatus,
  type PrismaClient,
} from "@prisma/client";

type PrismaLikeClient = PrismaClient | Prisma.TransactionClient;

export async function releaseExpiredReservations(client: PrismaLikeClient, now: Date) {
  const expiredReservations = await client.reservation.findMany({
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
    return { releasedCount: 0 };
  }

  const reservationIds = expiredReservations.map((reservation) => reservation.id);
  const ticketIds = expiredReservations.map((reservation) => reservation.ticketId);

  await client.reservation.updateMany({
    where: {
      id: { in: reservationIds },
      status: ReservationStatus.ACTIVE,
    },
    data: {
      status: ReservationStatus.RELEASED,
      releasedAt: now,
    },
  });

  await client.ticket.updateMany({
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

  return { releasedCount: reservationIds.length };
}
