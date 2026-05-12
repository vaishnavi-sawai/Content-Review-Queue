import { Locale, TicketStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { DashboardService } from "@/services/dashboard/DashboardService";
import { DashboardDomainError } from "@/services/dashboard/DashboardDomainError";
import { RESERVATION_WINDOW_MS } from "@/services/review-queue/constants";
import { releaseExpiredReservations } from "@/services/review-queue/releaseExpiredReservations";
import { createPrismaTestClient } from "@/tests/prismaTestClient";

const prisma = createPrismaTestClient();

describe("DashboardService", () => {
  let service: DashboardService;

  beforeAll(async () => {
    service = new DashboardService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("reserves then confirms a ticket", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const reviewer = await prisma.reviewer.create({
      data: {
        reviewerCode: `svc-ok-${suffix}`,
        locale: Locale.MIDWEST,
      },
    });

    const ticket = await prisma.ticket.create({
      data: {
        title: "Reserve flow",
        description: "d",
        locale: Locale.MIDWEST,
        status: TicketStatus.AVAILABLE,
      },
    });

    const reserved = await service.reserveTicket({
      locale: Locale.MIDWEST,
      reviewerId: reviewer.id,
      ticketId: ticket.id,
    });

    expect(reserved.ticketId).toBe(ticket.id);
    expect(reserved.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const confirmed = await service.confirmTicket({
      locale: Locale.MIDWEST,
      reviewerId: reviewer.id,
      ticketId: ticket.id,
    });

    expect(confirmed.status).toBe(TicketStatus.CONFIRMED);

    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.reviewer.delete({ where: { id: reviewer.id } });
  });

  it("reserveTicket rejects wrong locale", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const reviewer = await prisma.reviewer.create({
      data: {
        reviewerCode: `svc-locale-${suffix}`,
        locale: Locale.SOUTH,
      },
    });

    const ticket = await prisma.ticket.create({
      data: {
        title: "Wrong locale",
        description: "d",
        locale: Locale.WEST_COAST,
        status: TicketStatus.AVAILABLE,
      },
    });

    await expect(
      service.reserveTicket({
        locale: Locale.SOUTH,
        reviewerId: reviewer.id,
        ticketId: ticket.id,
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DashboardDomainError && err.trpcCode === "NOT_FOUND",
    );

    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.reviewer.delete({ where: { id: reviewer.id } });
  });

  it("reserveTicket rejects second claim on same ticket", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const [r1, r2] = await Promise.all([
      prisma.reviewer.create({
        data: { reviewerCode: `svc-dup-a-${suffix}`, locale: Locale.EAST_COAST },
      }),
      prisma.reviewer.create({
        data: { reviewerCode: `svc-dup-b-${suffix}`, locale: Locale.EAST_COAST },
      }),
    ]);

    const ticket = await prisma.ticket.create({
      data: {
        title: "Double claim",
        description: "d",
        locale: Locale.EAST_COAST,
        status: TicketStatus.AVAILABLE,
      },
    });

    await service.reserveTicket({
      locale: Locale.EAST_COAST,
      reviewerId: r1.id,
      ticketId: ticket.id,
    });

    await expect(
      service.reserveTicket({
        locale: Locale.EAST_COAST,
        reviewerId: r2.id,
        ticketId: ticket.id,
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DashboardDomainError && err.trpcCode === "CONFLICT",
    );

    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.reviewer.deleteMany({ where: { id: { in: [r1.id, r2.id] } } });
  });

  it("only one parallel reserve wins for the same ticket", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const [r1, r2] = await Promise.all([
      prisma.reviewer.create({
        data: { reviewerCode: `svc-par-a-${suffix}`, locale: Locale.WEST_COAST },
      }),
      prisma.reviewer.create({
        data: { reviewerCode: `svc-par-b-${suffix}`, locale: Locale.WEST_COAST },
      }),
    ]);

    const ticket = await prisma.ticket.create({
      data: {
        title: "Parallel",
        description: "d",
        locale: Locale.WEST_COAST,
        status: TicketStatus.AVAILABLE,
      },
    });

    const results = await Promise.allSettled([
      service.reserveTicket({
        locale: Locale.WEST_COAST,
        reviewerId: r1.id,
        ticketId: ticket.id,
      }),
      service.reserveTicket({
        locale: Locale.WEST_COAST,
        reviewerId: r2.id,
        ticketId: ticket.id,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(reason).toBeInstanceOf(DashboardDomainError);
    expect((reason as DashboardDomainError).trpcCode).toBe("CONFLICT");

    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.reviewer.deleteMany({ where: { id: { in: [r1.id, r2.id] } } });
  });

  it("confirmTicket rejects another reviewer's reservation", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const [owner, other] = await Promise.all([
      prisma.reviewer.create({
        data: { reviewerCode: `svc-own-${suffix}`, locale: Locale.MIDWEST },
      }),
      prisma.reviewer.create({
        data: { reviewerCode: `svc-oth-${suffix}`, locale: Locale.MIDWEST },
      }),
    ]);

    const ticket = await prisma.ticket.create({
      data: {
        title: "Forbidden confirm",
        description: "d",
        locale: Locale.MIDWEST,
        status: TicketStatus.AVAILABLE,
      },
    });

    await service.reserveTicket({
      locale: Locale.MIDWEST,
      reviewerId: owner.id,
      ticketId: ticket.id,
    });

    await expect(
      service.confirmTicket({
        locale: Locale.MIDWEST,
        reviewerId: other.id,
        ticketId: ticket.id,
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DashboardDomainError && err.trpcCode === "FORBIDDEN",
    );

    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.reviewer.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
  });

  it("confirmTicket fails after reservation window (fake timers)", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-01T10:00:00.000Z") });

    const suffix = crypto.randomUUID().slice(0, 8);
    const reviewer = await prisma.reviewer.create({
      data: {
        reviewerCode: `svc-exp-${suffix}`,
        locale: Locale.SOUTH,
      },
    });

    const ticket = await prisma.ticket.create({
      data: {
        title: "Expiry confirm",
        description: "d",
        locale: Locale.SOUTH,
        status: TicketStatus.AVAILABLE,
      },
    });

    await service.reserveTicket({
      locale: Locale.SOUTH,
      reviewerId: reviewer.id,
      ticketId: ticket.id,
    });

    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z").getTime() + RESERVATION_WINDOW_MS + 60_000);

    await expect(
      service.confirmTicket({
        locale: Locale.SOUTH,
        reviewerId: reviewer.id,
        ticketId: ticket.id,
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DashboardDomainError && err.trpcCode === "CONFLICT",
    );

    vi.useRealTimers();

    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.reviewer.delete({ where: { id: reviewer.id } });
  });

  it("getAvailableTickets lists ticket again after worker releases expired reservation", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-01T08:00:00.000Z") });

    const suffix = crypto.randomUUID().slice(0, 8);
    const reviewer = await prisma.reviewer.create({
      data: {
        reviewerCode: `svc-list-${suffix}`,
        locale: Locale.WEST_COAST,
      },
    });

    const ticket = await prisma.ticket.create({
      data: {
        title: "Re-queue list",
        description: "d",
        locale: Locale.WEST_COAST,
        status: TicketStatus.AVAILABLE,
      },
    });

    await service.reserveTicket({
      locale: Locale.WEST_COAST,
      reviewerId: reviewer.id,
      ticketId: ticket.id,
    });

    vi.setSystemTime(new Date("2026-07-01T08:00:00.000Z").getTime() + RESERVATION_WINDOW_MS + 5_000);

    await releaseExpiredReservations(prisma, new Date());

    const available = await service.getAvailableTickets(Locale.WEST_COAST);
    const ids = available.map((t) => t.id);
    expect(ids).toContain(ticket.id);

    vi.useRealTimers();

    await prisma.ticket.delete({ where: { id: ticket.id } });
    await prisma.reviewer.delete({ where: { id: reviewer.id } });
  });
});
