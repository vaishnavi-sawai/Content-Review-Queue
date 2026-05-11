"use client";

import { useEffect, useMemo, useState } from "react";

function calculateSeconds(target: number | null) {
  if (!target) {
    return 0;
  }

  return Math.max(Math.floor((target - Date.now()) / 1000), 0);
}

export function useReservationCountdown(expiresAt: string | null | undefined) {
  const target = useMemo(() => (expiresAt ? new Date(expiresAt).getTime() : null), [expiresAt]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => calculateSeconds(target));

  useEffect(() => {
    if (!target) {
      return;
    }

    const tick = () => {
      setRemainingSeconds(calculateSeconds(target));
    };

    const initialTick = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, 1000);

    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(intervalId);
    };
  }, [target]);

  if (!target) {
    return 0;
  }

  return remainingSeconds;
}
