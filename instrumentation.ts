import { prisma } from "@/services/db/prisma";
import { ensureSeedData } from "@/services/startupSeed/seed";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  await ensureSeedData(prisma);
}
