import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { releaseExpiredReservations } from "./releaseExpiredReservations";

const WORKER_INTERVAL_MS = 30_000;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for queue worker.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

let isSweepRunning = false;

async function runSweep() {
  if (isSweepRunning) {
    return;
  }

  isSweepRunning = true;

  try {
    const { releasedCount } = await releaseExpiredReservations(prisma, new Date());
    if (releasedCount > 0) {
      console.log(`[queue-worker] Released ${releasedCount} expired reservations.`);
    }
  } catch (error) {
    console.error("[queue-worker] Failed to release expired reservations", error);
  } finally {
    isSweepRunning = false;
  }
}

async function shutdown(signal: NodeJS.Signals) {
  console.log(`[queue-worker] Received ${signal}, shutting down.`);
  await prisma.$disconnect();
  process.exit(0);
}

async function main() {
  console.log(`[queue-worker] Started. Interval: ${WORKER_INTERVAL_MS}ms.`);
  await runSweep();

  setInterval(() => {
    void runSweep();
  }, WORKER_INTERVAL_MS);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

main().catch(async (error) => {
  console.error("[queue-worker] Startup failed", error);
  await prisma.$disconnect();
  process.exit(1);
});
