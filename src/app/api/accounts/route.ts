import { NextRequest, NextResponse } from "next/server";
import { buildAccounts, filterSignals, parseSignalFilters, signalFacets } from "@/lib/accounts";
import { jsonError } from "@/lib/http";
import { filterSignalsByReviewStatus, latestReviewsBySignal, parseReviewStatusFilters, reviewsForSignals, reviewStatusCounts } from "@/lib/reviews";
import { readReviews, readSignals, readSyncState } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const filters = parseSignalFilters(request.nextUrl.searchParams);
    const reviewStatuses = parseReviewStatusFilters(request.nextUrl.searchParams);
    const allSignals = await readSignals();
    const reviews = await readReviews();
    const filteredSignals = filterSignalsByReviewStatus(filterSignals(allSignals, filters), reviews, reviewStatuses);
    const accounts = buildAccounts(filteredSignals);
    const reviewsBySignal = latestReviewsBySignal(reviews);
    const sync = await readSyncState();

    return NextResponse.json({
      accounts,
      count: accounts.length,
      signalCount: filteredSignals.length,
      facets: signalFacets(filteredSignals),
      globalFacets: signalFacets(allSignals),
      reviewsBySignal,
      reviewStatus: reviewStatusCounts(reviewsForSignals(reviews, allSignals)),
      sync,
    });
  } catch (error) {
    return jsonError(error);
  }
}
