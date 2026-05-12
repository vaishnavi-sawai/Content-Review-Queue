import { Locale, ReservationStatus, TicketStatus } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import { releaseExpiredReservations } from "@/services/review-queue/releaseExpiredReservations";
import { createPrismaTestClient } from "@/tests/prismaTestClient";

const prisma = createPrismaTestClient();

describe("releaseExpiredReservations", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("marks expired active reservations released and tickets available", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const reviewer = await prisma.reviewer.create({
      data: {
        reviewerCode: `rel-rev-${suffix}`,
        locale: Locale.WEST_COAST,
      },
    });

    const ticket = await prisma.ticket.create({
      data: {
        title: "Rel test ticket",
        description: "d",
        locale: Locale.WEST_COAST,
        status: TicketStatus.RESERVED,
      },
    });

    const past = new Date(Date.now() - 60_000);
    const reservation = await prisma.reservation.create({
      data: {
        ticketId: ticket.id,
        reviewerId: reviewer.id,
        status: ReservationStatus.ACTIVE,
        reservedAt: new Date(past.getTime() - 3_600_000),
        expiresAt: past,
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentReservationId: reservation.id,
        reservationExpiresAt: past,
      },
    });

    const { releasedCount } = await releaseExpiredReservations(prisma, new Date());
    expect(releasedCount).toBeGreaterThanOrEqual(1);

    const updatedTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(updatedTicket.status).toBe(TicketStatus.AVAILABLE);
    expect(updatedTicket.currentReservationId).toBeNull();
    expect(updatedTicket.reservationExpiresAt).toBeNull();

    const updatedReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
    });
    expect(updatedReservation.status).toBe(ReservationStatus.RELEASED);
    expect(updatedReservation.releasedAt).not.toBeNull();

    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.reviewer.delete({ where: { id: reviewer.id } });
  });

  it("does not release active reservations still inside the window", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const reviewer = await prisma.reviewer.create({
      data: {
        reviewerCode: `rel-future-${suffix}`,
        locale: Locale.EAST_COAST,
      },
    });

    const ticket = await prisma.ticket.create({
      data: {
        title: "Future expiry",
        description: "d",
        locale: Locale.EAST_COAST,
        status: TicketStatus.RESERVED,
      },
    });

    const future = new Date(Date.now() + 3_600_000);
    const reservation = await prisma.reservation.create({
      data: {
        ticketId: ticket.id,
        reviewerId: reviewer.id,
        status: ReservationStatus.ACTIVE,
        expiresAt: future,
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentReservationId: reservation.id,
        reservationExpiresAt: future,
      },
    });

    await releaseExpiredReservations(prisma, new Date());

    const unchanged = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(unchanged.status).toBe(TicketStatus.RESERVED);
    expect(unchanged.currentReservationId).toBe(reservation.id);

    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.reviewer.delete({ where: { id: reviewer.id } });
  });
});
