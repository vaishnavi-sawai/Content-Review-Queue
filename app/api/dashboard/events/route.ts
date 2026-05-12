import { Locale } from "@prisma/client";
import type { NextRequest } from "next/server";

import { REVIEW_QUEUE_SESSION_COOKIE_KEY } from "@/constants/review-queue-session";
import { subscribeDashboardUpdates } from "@/lib/review-queue/dashboardEvents";
import { prisma } from "@/services/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParsedSession = {
  reviewerCode: string;
  locale: Locale;
};

const VALID_LOCALES = new Set(Object.values(Locale));
const UNAUTHORIZED_RESPONSE = new Response("Unauthorized", { status: 401 });

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && VALID_LOCALES.has(value as Locale);
}

function parseSessionFromCookie(cookieValue: string | undefined): ParsedSession | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue ?? "")) as Partial<ParsedSession>;
    const reviewerCode = typeof parsed.reviewerCode === "string" ? parsed.reviewerCode : null;
    const locale = isLocale(parsed.locale) ? parsed.locale : null;
    return reviewerCode && locale ? { reviewerCode, locale } : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rawSessionCookie = request.cookies.get(REVIEW_QUEUE_SESSION_COOKIE_KEY)?.value;
  const session = parseSessionFromCookie(rawSessionCookie);

  if (!session) {
    return UNAUTHORIZED_RESPONSE;
  }

  const reviewer = await prisma.reviewer.findFirst({
    where: {
      reviewerCode: session.reviewerCode,
      locale: session.locale,
    },
    select: {
      id: true,
    },
  });

  if (!reviewer) {
    return UNAUTHORIZED_RESPONSE;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isClosed = false;

      const send = (chunk: string) => {
        if (!isClosed) {
          controller.enqueue(encoder.encode(chunk));
        }
      };

      send('event: connected\ndata: {"ok":true}\n\n');

      const unsubscribe = subscribeDashboardUpdates((event) => {
        if (event.locale !== session.locale) {
          return;
        }
        send(`event: dashboard:update\ndata: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => {
        send(": ping\n\n");
      }, 15_000);

      const close = () => {
        if (!isClosed) {
          isClosed = true;
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
