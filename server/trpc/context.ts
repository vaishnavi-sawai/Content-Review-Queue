import { Locale } from "@prisma/client";

import { prisma } from "@/services/db/prisma";

interface CreateTRPCContextOptions {
  req: Request;
}

export async function createTRPCContext({ req }: CreateTRPCContextOptions) {
  const reviewerCode = req.headers.get("x-reviewer-id");
  const localeHeader = req.headers.get("x-reviewer-locale");

  const reviewer =
    reviewerCode && localeHeader
      ? await prisma.reviewer.findFirst({
          where: {
            reviewerCode,
            locale: localeHeader as Locale,
          },
        })
      : null;

  return {
    prisma,
    reviewer,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
