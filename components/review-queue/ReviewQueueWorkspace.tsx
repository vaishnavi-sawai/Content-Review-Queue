"use client";

import { useCallback } from "react";

import { LOCALE_LABELS } from "@/constants/review-queue";
import { trpc } from "@/server/trpc/client";
import { MetricsPanel } from "./MetricsPanel";
import { ReservationPanel } from "./ReservationPanel";
import { TicketList } from "./TicketList";
import type { ReviewerSession } from "./types";

const POLL_INTERVAL_MS = 5_000;

interface ReviewQueueWorkspaceProps {
  session: ReviewerSession;
  onSignOut: () => void;
}

export function ReviewQueueWorkspace({ session, onSignOut }: ReviewQueueWorkspaceProps) {
  const trpcUtils = trpc.useUtils();

  const availableTicketsQuery = trpc.dashboard.availableTickets.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
  });

  const activeReservationsQuery = trpc.dashboard.activeReservations.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
  });

  const metricsQuery = trpc.dashboard.metrics.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
  });

  const invalidateDashboard = useCallback(() => {
    void trpcUtils.dashboard.availableTickets.invalidate();
    void trpcUtils.dashboard.activeReservations.invalidate();
    void trpcUtils.dashboard.metrics.invalidate();
  }, [trpcUtils]);

  const reserveMutation = trpc.dashboard.reserveTicket.useMutation({
    onSuccess: invalidateDashboard,
  });

  const confirmMutation = trpc.dashboard.confirmTicket.useMutation({
    onSuccess: invalidateDashboard,
  });

  const errorMessage = reserveMutation.error?.message ?? confirmMutation.error?.message ?? null;
  const activeReservations = activeReservationsQuery.data ?? [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-8">
      <header className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-500">Authenticated reviewer</p>
        <h1 className="text-2xl font-semibold text-zinc-900">{session.reviewerCode}</h1>
        <p className="text-sm text-zinc-700">Locale: {LOCALE_LABELS[session.locale]}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Sign out
        </button>
      </header>

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <MetricsPanel metrics={metricsQuery.data} isLoading={metricsQuery.isLoading} />

      {activeReservations.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Reserved Tickets</h2>
          <div className="mt-3 space-y-3">
          {activeReservations.map((activeReservation) => (
            <ReservationPanel
              key={activeReservation.reservation.id}
              ticketId={activeReservation.ticket.id}
              ticketTitle={activeReservation.ticket.title}
              expiresAt={activeReservation.reservation.expiresAt}
              onConfirm={(ticketId) => confirmMutation.mutate({ ticketId })}
              isConfirming={confirmMutation.isPending}
            />
          ))}
          </div>
        </section>
      ) : null}

      <TicketList
        tickets={availableTicketsQuery.data ?? []}
        isLoading={availableTicketsQuery.isLoading}
        reserveTicket={(ticketId) => reserveMutation.mutate({ ticketId })}
        isReserving={reserveMutation.isPending}
      />
    </main>
  );
}
