"use client";

import { useReservationCountdown } from "./useReservationCountdown";

interface ReservationPanelProps {
  ticketTitle: string;
  ticketId: string;
  expiresAt: string;
  onConfirm: (ticketId: string) => void;
  isConfirming: boolean;
}

export function ReservationPanel({
  ticketTitle,
  ticketId,
  expiresAt,
  onConfirm,
  isConfirming,
}: ReservationPanelProps) {
  const remainingSeconds = useReservationCountdown(expiresAt);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Reserved Ticket</h3>
      <p className="mt-2 text-sm text-zinc-700">
        <span className="font-medium">{ticketTitle}</span> is reserved for you.
      </p>
      <p className="mt-1 text-sm text-zinc-700">
        Time remaining:{" "}
        <span className="font-semibold">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </p>

      <button
        type="button"
        onClick={() => onConfirm(ticketId)}
        disabled={isConfirming || remainingSeconds === 0}
        className="mt-3 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isConfirming ? "Confirming..." : "Confirm processing"}
      </button>
    </section>
  );
}
