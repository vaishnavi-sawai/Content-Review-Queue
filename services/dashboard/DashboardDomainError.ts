import "server-only";

/** Maps to {@link import("@trpc/server").TRPCError} `code` in the router. */
export type DashboardTrpcErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INTERNAL_SERVER_ERROR";

export class DashboardDomainError extends Error {
  constructor(
    public readonly trpcCode: DashboardTrpcErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DashboardDomainError";
  }
}
