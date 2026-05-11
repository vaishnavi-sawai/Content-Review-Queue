"use client";

import { useState } from "react";

import { LoginForm } from "./LoginForm";
import { ReviewQueueWorkspace } from "./ReviewQueueWorkspace";
import { TrpcProvider } from "./TrpcProvider";
import type { ReviewerSession } from "./types";

export function ReviewQueueShell() {
  const [session, setSession] = useState<ReviewerSession | null>(null);

  const signOut = () => {
    setSession(null);
  };

  if (!session) {
    return (
      <TrpcProvider reviewerCode={null} locale={null}>
        <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-8">
          <LoginForm onAuthenticated={setSession} />
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
