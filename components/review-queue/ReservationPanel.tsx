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
    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-medium text-zinc-900">{ticketTitle}</p>
        <p className="text-sm text-zinc-700">
          Time remaining:{" "}
          <span className="font-semibold">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => onConfirm(ticketId)}
        disabled={isConfirming || remainingSeconds === 0}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isConfirming ? "Confirming..." : "Confirm processing"}
      </button>
    </div>
  );
}
