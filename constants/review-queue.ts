import { Locale } from "@prisma/client";

export const LOCALE_LABELS: Record<Locale, string> = {
  [Locale.WEST_COAST]: "West Coast",
  [Locale.EAST_COAST]: "East Coast",
  [Locale.MIDWEST]: "Midwest",
  [Locale.SOUTH]: "South",
};
