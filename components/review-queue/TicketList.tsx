"use client";

import type { QueueTicket } from "./types";

interface TicketListProps {
  tickets: QueueTicket[];
  isLoading: boolean;
  reserveTicket: (ticketId: string) => void;
  isReserving: boolean;
}

export function TicketList({ tickets, isLoading, reserveTicket, isReserving }: TicketListProps) {
  const body = isLoading ? (
    <p className="mt-3 text-sm text-zinc-600">Loading tickets...</p>
  ) : tickets.length === 0 ? (
    <p className="mt-3 text-sm text-zinc-600">
      No tickets are available right now for your locale.
    </p>
  ) : (
    <ul className="mt-3 space-y-3">
      {tickets.map((ticket) => (
        <li key={ticket.id} className="rounded-lg border border-zinc-200 p-3">
          <h3 className="font-medium text-zinc-900">{ticket.title}</h3>
          <p className="mt-1 text-sm text-zinc-600">{ticket.description}</p>
          <button
            type="button"
            onClick={() => reserveTicket(ticket.id)}
            disabled={isReserving}
            className="mt-3 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Reserve
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Available Tickets</h2>
      {body}
    </section>
  );
}
