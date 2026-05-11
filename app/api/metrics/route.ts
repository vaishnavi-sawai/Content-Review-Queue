import { ReservationStatus, TicketStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/services/db/prisma";
import { releaseExpiredReservations } from "@/services/review-queue/releaseExpiredReservations";

export async function GET() {
  const now = new Date();
  await releaseExpiredReservations(prisma, now);

  const [available, reserved, confirmed, released] = await Promise.all([
    prisma.ticket.count({ where: { status: TicketStatus.AVAILABLE } }),
    prisma.ticket.count({ where: { status: TicketStatus.RESERVED } }),
    prisma.ticket.count({ where: { status: TicketStatus.CONFIRMED } }),
    prisma.reservation.count({ where: { status: ReservationStatus.RELEASED } }),
  ]);

  return NextResponse.json({
    available,
    reserved,
    confirmed,
    released,
    timestamp: now.toISOString(),
  });
}
