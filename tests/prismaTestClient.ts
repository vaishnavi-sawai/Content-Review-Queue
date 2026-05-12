import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export function createPrismaTestClient(): PrismaClient {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set DATABASE_URL or TEST_DATABASE_URL to run integration tests.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: ["error"],
  });
}
