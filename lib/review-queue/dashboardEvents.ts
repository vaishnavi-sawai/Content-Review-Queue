import { EventEmitter } from "node:events";
import type { Locale } from "@prisma/client";

export interface DashboardUpdateEvent {
  type: "dashboard:update";
  locale: Locale;
  reason: "reservation_released";
}

const dashboardEventBus = new EventEmitter();
dashboardEventBus.setMaxListeners(0);

export function publishDashboardUpdate(locale: Locale) {
  const event: DashboardUpdateEvent = {
    type: "dashboard:update",
    locale,
    reason: "reservation_released",
  };
  dashboardEventBus.emit("dashboard:update", event);
}

export function subscribeDashboardUpdates(
  listener: (event: DashboardUpdateEvent) => void,
) {
  dashboardEventBus.on("dashboard:update", listener);
  return () => dashboardEventBus.off("dashboard:update", listener);
}
