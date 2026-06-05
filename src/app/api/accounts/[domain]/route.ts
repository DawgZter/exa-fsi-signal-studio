import { NextRequest, NextResponse } from "next/server";
import { buildAccounts, filterSignals, signalFacets } from "@/lib/accounts";
import { toClientSignal } from "@/lib/client-signals";
import { jsonError } from "@/lib/http";
import { normalizeDomain } from "@/lib/logo";
import { attachSignalReviews, filterSignalsByReviewStatus, parseReviewStatusFilters, reviewsForSignals, reviewStatusCounts } from "@/lib/reviews";
import { readReviews, readSignals, readSyncState } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> },
): Promise<NextResponse> {
  try {
    const { domain } = await context.params;
    const allSignals = await readSignals();
    const accountDomain = normalizeDomain(decodeURIComponent(domain));
    const accountSignals = filterSignals(allSignals, { accountDomain });
    const account = buildAccounts(accountSignals)[0];
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const reviews = await readReviews();
    const reviewStatuses = parseReviewStatusFilters(request.nextUrl.searchParams);
    const signals = filterSignalsByReviewStatus(accountSignals, reviews, reviewStatuses);
    const sync = await readSyncState();
    return NextResponse.json({
      account,
      signals: attachSignalReviews(signals, reviews).map(toClientSignal),
      facets: signalFacets(signals),
      reviewStatus: reviewStatusCounts(reviewsForSignals(reviews, accountSignals)),
      sync,
    });
  } catch (error) {
    return jsonError(error);
  }
}
