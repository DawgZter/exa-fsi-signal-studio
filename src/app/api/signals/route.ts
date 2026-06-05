import { NextRequest, NextResponse } from "next/server";
import { filterSignals, parseSignalFilters, signalFacets } from "@/lib/accounts";
import { toClientSignal } from "@/lib/client-signals";
import { jsonError } from "@/lib/http";
import { attachSignalReviews, filterSignalsByReviewStatus, parseReviewStatusFilters, reviewsForSignals, reviewStatusCounts } from "@/lib/reviews";
import { readReviews, readSignals, readSyncState } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const filters = parseSignalFilters(request.nextUrl.searchParams);
    const reviewStatuses = parseReviewStatusFilters(request.nextUrl.searchParams);
    const allSignals = await readSignals();
    const reviews = await readReviews();
    const signals = filterSignalsByReviewStatus(filterSignals(allSignals, filters), reviews, reviewStatuses);
    const sync = await readSyncState();
    return NextResponse.json({
      signals: attachSignalReviews(signals, reviews).map(toClientSignal),
      facets: signalFacets(signals),
      globalFacets: signalFacets(allSignals),
      count: signals.length,
      reviewStatus: reviewStatusCounts(reviewsForSignals(reviews, allSignals)),
      sync,
    });
  } catch (error) {
    return jsonError(error);
  }
}
