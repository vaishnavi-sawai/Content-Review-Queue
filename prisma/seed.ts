import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Locale, PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for seeding.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const REVIEWERS: Array<{ reviewerCode: string; locale: Locale }> = [
  { reviewerCode: "reviewer-west-1", locale: Locale.WEST_COAST },
  { reviewerCode: "reviewer-east-1", locale: Locale.EAST_COAST },
  { reviewerCode: "reviewer-midwest-1", locale: Locale.MIDWEST },
  { reviewerCode: "reviewer-south-1", locale: Locale.SOUTH },
];

const TICKET_COUNT_PER_LOCALE = 8;

const LOCALE_TITLE_PREFIX: Record<Locale, string> = {
  [Locale.WEST_COAST]: "West Coast",
  [Locale.EAST_COAST]: "East Coast",
  [Locale.MIDWEST]: "Midwest",
  [Locale.SOUTH]: "South",
};

async function main() {
  const [reviewerCount, ticketCount] = await Promise.all([
    prisma.reviewer.count(),
    prisma.ticket.count(),
  ]);

  if (reviewerCount > 0 || ticketCount > 0) {
    console.log("Seed skipped. Existing data found.");
    return;
  }

  await prisma.reviewer.createMany({
    data: REVIEWERS,
  });

  const tickets = Object.values(Locale).flatMap((locale) =>
    Array.from({ length: TICKET_COUNT_PER_LOCALE }).map((_, index) => ({
      seedKey: `${locale}-ticket-${index + 1}`,
      title: `${LOCALE_TITLE_PREFIX[locale]} Ticket ${index + 1}`,
      description: `Review content batch ${index + 1} for ${locale.replace("_", " ").toLowerCase()}.`,
      locale,
    })),
  );

  await prisma.ticket.createMany({ data: tickets, skipDuplicates: true });
  console.log("Seed completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
