interface ApiErrorLike {
  code?: string;
  message?: string;
}

interface ErrorOptions {
  fallback?: string;
}

export const toUserFacingError = (error: ApiErrorLike | null | undefined, options?: ErrorOptions): string => {
  const fallback = options?.fallback ?? "Something went wrong. Please try again.";

  switch (error?.code) {
    case "AI_RATE_LIMITED":
      return "AI is busy, retrying...";
    case "INVALID_AI_RESPONSE":
    case "AI_VALIDATION_ERROR":
      return "Could not understand the transaction.";
    case "BAD_REQUEST":
      return "Please enter a valid input.";
    case "DATABASE_ERROR":
      return "Database is unavailable right now. Please try again.";
    default:
      return error?.message?.trim() ? error.message : fallback;
  }
};
