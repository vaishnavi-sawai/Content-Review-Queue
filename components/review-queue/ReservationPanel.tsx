"use client";

interface ReservationPanelProps {
  ticketTitle: string;
  ticketId: string;
  expiresAt: Date | string;
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
  const expiryDate = new Date(expiresAt);
  const expiryLabel = Number.isFinite(expiryDate.getTime())
    ? expiryDate.toLocaleString()
    : "Unknown";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-medium text-zinc-900">{ticketTitle}</p>
        <p className="text-sm text-zinc-700">Expires at: {expiryLabel}</p>
      </div>
      <button
        type="button"
        onClick={() => onConfirm(ticketId)}
        disabled={isConfirming}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isConfirming ? "Confirming..." : "Confirm processing"}
      </button>
    </div>
  );
}
