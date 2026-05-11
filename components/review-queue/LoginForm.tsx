"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Locale } from "@prisma/client";
import type { inferRouterOutputs } from "@trpc/server";
import { useForm } from "react-hook-form";

import { LOCALE_LABELS } from "@/constants/review-queue";
import type { AppRouter } from "@/server/trpc/routers/_app";
import { trpc } from "@/server/trpc/client";
import { loginFormSchema, type LoginFormValues } from "./LoginForm.schema";
import type { ReviewerSession } from "./types";

type AuthenticateOutput = inferRouterOutputs<AppRouter>["reviewerAuth"]["authenticate"];

interface LoginFormProps {
  onAuthenticated: (session: ReviewerSession) => void;
}

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const authenticateMutation = trpc.reviewerAuth.authenticate.useMutation({
    onSuccess(result: AuthenticateOutput) {
      onAuthenticated({
        reviewerCode: result.reviewerCode,
        locale: result.locale,
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      reviewerCode: "reviewer-west-1",
      locale: Locale.WEST_COAST,
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    authenticateMutation.mutate(values);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-2xl font-semibold text-zinc-900">Locale Ticket Review Queue</h1>
      <p className="text-sm text-zinc-600">
        Authenticate with a seeded reviewer ID and locale to start reserving tickets.
      </p>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Reviewer ID
        <input
          {...register("reviewerCode")}
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-blue-500 focus:ring-2"
          placeholder="reviewer-west-1"
        />
        {errors.reviewerCode ? (
          <span className="text-xs text-red-600">{errors.reviewerCode.message}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Locale
        <select
          {...register("locale")}
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-blue-500 focus:ring-2"
        >
          {Object.values(Locale).map((locale) => (
            <option key={locale} value={locale}>
              {LOCALE_LABELS[locale]}
            </option>
          ))}
        </select>
      </label>

      {authenticateMutation.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {authenticateMutation.error.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={authenticateMutation.isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-500"
      >
        {authenticateMutation.isPending ? "Authenticating..." : "Sign in"}
      </button>
    </form>
  );
}
