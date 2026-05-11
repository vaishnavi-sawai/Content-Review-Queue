import { Locale, type Prisma, type PrismaClient } from "@prisma/client";

type PrismaLikeClient = PrismaClient | Prisma.TransactionClient;

const SEED_REVIEWERS: Array<{ reviewerCode: string; locale: Locale }> = [
  { reviewerCode: "reviewer-west-1", locale: Locale.WEST_COAST },
  { reviewerCode: "reviewer-east-1", locale: Locale.EAST_COAST },
  { reviewerCode: "reviewer-midwest-1", locale: Locale.MIDWEST },
  { reviewerCode: "reviewer-south-1", locale: Locale.SOUTH },
];

const SEED_TICKET_COUNT_PER_LOCALE = 10;

const LOCALE_NAME: Record<Locale, string> = {
  [Locale.WEST_COAST]: "West Coast",
  [Locale.EAST_COAST]: "East Coast",
  [Locale.MIDWEST]: "Midwest",
  [Locale.SOUTH]: "South",
};

export async function ensureSeedData(client: PrismaLikeClient) {
  await Promise.all(
    SEED_REVIEWERS.map((reviewer) =>
      client.reviewer.upsert({
        where: { reviewerCode: reviewer.reviewerCode },
        update: { locale: reviewer.locale },
        create: reviewer,
      }),
    ),
  );

  const tickets = Object.values(Locale).flatMap((locale) =>
    Array.from({ length: SEED_TICKET_COUNT_PER_LOCALE }).map((_, index) => ({
      id: `seed-${locale.toLowerCase()}-${index + 1}`,
      title: `${LOCALE_NAME[locale]} Ticket ${index + 1}`,
      description: `Review content batch ${index + 1} for ${locale.toLowerCase().replace("_", " ")}.`,
      locale,
    })),
  );

  await client.ticket.createMany({
    data: tickets,
    skipDuplicates: true,
  });
}
