import { Locale } from "@prisma/client";

import { prisma } from "@/services/db/prisma";

const SEED_REVIEWERS: Array<{ reviewerCode: string; locale: Locale }> = [
  { reviewerCode: "reviewer-west-1", locale: Locale.WEST_COAST },
  { reviewerCode: "reviewer-east-1", locale: Locale.EAST_COAST },
  { reviewerCode: "reviewer-midwest-1", locale: Locale.MIDWEST },
  { reviewerCode: "reviewer-south-1", locale: Locale.SOUTH },
];

const SEED_TICKET_COUNT_PER_LOCALE = 8;

const LOCALE_NAME: Record<Locale, string> = {
  [Locale.WEST_COAST]: "West Coast",
  [Locale.EAST_COAST]: "East Coast",
  [Locale.MIDWEST]: "Midwest",
  [Locale.SOUTH]: "South",
};

export async function ensureSeedData() {
  await Promise.all(
    SEED_REVIEWERS.map((reviewer) =>
      prisma.reviewer.upsert({
        where: { reviewerCode: reviewer.reviewerCode },
        update: { locale: reviewer.locale },
        create: reviewer,
      }),
    ),
  );

  const tickets = Object.values(Locale).flatMap((locale) =>
    Array.from({ length: SEED_TICKET_COUNT_PER_LOCALE }).map((_, index) => ({
      seedKey: `${locale}-ticket-${index + 1}`,
      title: `${LOCALE_NAME[locale]} Ticket ${index + 1}`,
      description: `Review content batch ${index + 1} for ${locale.toLowerCase().replace("_", " ")}.`,
      locale,
    })),
  );

  await prisma.ticket.createMany({
    data: tickets,
    skipDuplicates: true,
  });
}
