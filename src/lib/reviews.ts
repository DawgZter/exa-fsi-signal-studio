import type { SignalRecord, SignalReview } from "./domain";

export type ReviewStatusFilter = SignalReview["status"] | "unreviewed";

export type SignalWithReview = SignalRecord & {
  review?: SignalReview;
};

function isReviewStatusFilter(value: string): value is ReviewStatusFilter {
  return value === "approved" || value === "needs_review" || value === "rejected" || value === "unreviewed";
}

export function parseReviewStatusFilters(searchParams: URLSearchParams): ReviewStatusFilter[] | undefined {
  const values = searchParams
    .getAll("reviewStatus")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  const statuses = values.filter(isReviewStatusFilter);

  return statuses.length ? statuses : undefined;
}

export function latestReviewsBySignal(reviews: SignalReview[]): Record<string, SignalReview> {
  const latest: Record<string, SignalReview> = {};
  for (const review of reviews) {
    const existing = latest[review.signalId];
    if (!existing || review.reviewedAt.localeCompare(existing.reviewedAt) > 0) {
      latest[review.signalId] = review;
    }
  }
  return latest;
}

export function attachSignalReviews(signals: SignalRecord[], reviews: SignalReview[]): SignalWithReview[] {
  const latest = latestReviewsBySignal(reviews);
  return signals.map((signal) => ({
    ...signal,
    review: latest[signal.id],
  }));
}

export function filterSignalsByReviewStatus(
  signals: SignalRecord[],
  reviews: SignalReview[],
  statuses: ReviewStatusFilter[] | undefined,
): SignalRecord[] {
  if (!statuses?.length) {
    return signals;
  }
  const latest = latestReviewsBySignal(reviews);
  return signals.filter((signal) => statuses.includes(latest[signal.id]?.status ?? "unreviewed"));
}

export function reviewsForSignals(reviews: SignalReview[], signals: SignalRecord[]): SignalReview[] {
  const signalIds = new Set(signals.map((signal) => signal.id));
  return reviews.filter((review) => signalIds.has(review.signalId));
}

export function reviewStatusCounts(reviews: SignalReview[]): Record<string, number> {
  return Object.values(latestReviewsBySignal(reviews)).reduce<Record<string, number>>((acc, review) => {
    acc[review.status] = (acc[review.status] ?? 0) + 1;
    return acc;
  }, {});
}
