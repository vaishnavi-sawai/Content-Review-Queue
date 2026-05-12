import { Locale } from "@prisma/client";

import { REVIEW_QUEUE_SESSION_COOKIE_KEY } from "@/constants/review-queue-session";

import type { ParsedReviewerSession } from "./types";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_PREFIX = `${REVIEW_QUEUE_SESSION_COOKIE_KEY}=`;
const LOCALES = new Set(Object.values(Locale));

function getCookieValue(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const entry = window.document.cookie.split("; ").find((part) => part.startsWith(COOKIE_PREFIX));
  return entry ? entry.slice(COOKIE_PREFIX.length) : null;
}

function setCookie(value: string, suffix: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.document.cookie = `${COOKIE_PREFIX}${value}; Path=/; ${suffix}`;
}

export function loadReviewerSession(): ParsedReviewerSession | null {
  const cookieValue = getCookieValue();
  if (!cookieValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue)) as Partial<ParsedReviewerSession>;
    if (typeof parsed.reviewerCode !== "string" || typeof parsed.locale !== "string") {
      return null;
    }

    if (!LOCALES.has(parsed.locale)) {
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

export function saveReviewerSession(session: ParsedReviewerSession) {
  const encodedValue = encodeURIComponent(JSON.stringify(session));
  const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  setCookie(encodedValue, `Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`);
}

export function clearReviewerSession() {
  setCookie("", "Max-Age=0; SameSite=Lax");
}
