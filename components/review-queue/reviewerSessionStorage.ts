import { Locale } from "@prisma/client";

import type { ReviewerSession } from "./types";

const REVIEWER_SESSION_COOKIE_KEY = "review-queue-session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function isLocale(value: string): value is Locale {
  return Object.values(Locale).includes(value as Locale);
}

export function loadReviewerSession(): ReviewerSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawCookie = window.document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${REVIEWER_SESSION_COOKIE_KEY}=`));

  if (!rawCookie) {
    return null;
  }

  try {
    const cookieValue = rawCookie.slice(`${REVIEWER_SESSION_COOKIE_KEY}=`.length);
    const parsed = JSON.parse(decodeURIComponent(cookieValue)) as Partial<ReviewerSession>;
    if (typeof parsed.reviewerCode !== "string" || typeof parsed.locale !== "string") {
      return null;
    }

    if (!isLocale(parsed.locale)) {
      return null;
    }

    return {
      reviewerCode: parsed.reviewerCode,
      locale: parsed.locale,
    };
  } catch {
    return null;
  }
}

export function saveReviewerSession(session: ReviewerSession) {
  if (typeof window === "undefined") {
    return;
  }

  const encodedValue = encodeURIComponent(JSON.stringify(session));
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  window.document.cookie =
    `${REVIEWER_SESSION_COOKIE_KEY}=${encodedValue}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
}

export function clearReviewerSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.document.cookie = `${REVIEWER_SESSION_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}
