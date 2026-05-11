import { ensureSeedData } from "@/services/review-queue/bootstrap";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  await ensureSeedData();
}
