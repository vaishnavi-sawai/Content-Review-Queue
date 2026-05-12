"use client";

import { useEffect, useState } from "react";

import { LoginForm } from "./LoginForm";
import { ReviewQueueWorkspace } from "./ReviewQueueWorkspace";
import { TrpcProvider } from "./TrpcProvider";
import {
  clearReviewerSession,
  loadReviewerSession,
  saveReviewerSession,
} from "@/lib/review-queue/reviewerSessionStorage";
import type { ReviewerSession } from "./types";

export function ReviewQueueShell() {
  const [session, setSession] = useState<ReviewerSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSession(loadReviewerSession());
    setIsHydrated(true);
  }, []);

  const handleAuthenticated = (nextSession: ReviewerSession) => {
    saveReviewerSession(nextSession);
    setSession(nextSession);
  };

  const signOut = () => {
    clearReviewerSession();
    setSession(null);
  };

  if (!isHydrated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-8" />
    );
  }

  if (!session) {
    return (
      <TrpcProvider reviewerCode={null} locale={null}>
        <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-8">
          <LoginForm onAuthenticated={handleAuthenticated} />
        </main>
      </TrpcProvider>
    );
  }

  return (
    <TrpcProvider
      key={`${session.reviewerCode}-${session.locale}`}
      reviewerCode={session.reviewerCode}
      locale={session.locale}
    >
      <ReviewQueueWorkspace session={session} onSignOut={signOut} />
    </TrpcProvider>
  );
}
