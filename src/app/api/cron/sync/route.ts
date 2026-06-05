import { NextRequest, NextResponse } from "next/server";
import { refreshDueAccountSuggestions } from "@/lib/account-suggestions";
import { parseBoundedPositiveInt } from "@/lib/auth";
import { getOptionalEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { syncWebsetToStore } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertCronAuthorized(request: NextRequest): void {
  const secret = getOptionalEnv("CRON_SECRET") ?? getOptionalEnv("SYNC_SECRET");
  if (!secret && process.env.NODE_ENV !== "production") {
    return;
  }
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || bearer !== secret) {
    throw new Error("Unauthorized cron sync request.");
  }
}

function parseNonNegativeLimit(value: string | null, fallback: number, max: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) {
    throw new Error(`suggestionLimit must be an integer from 0 to ${max}.`);
  }
  return parsed;
}

function envSuggestionLimit(): number {
  const value = getOptionalEnv("ACCOUNT_SUGGESTION_CRON_LIMIT");
  if (!value) {
    return 12;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? Math.min(parsed, 50) : 12;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    assertCronAuthorized(request);
    const maxItems = parseBoundedPositiveInt(request.nextUrl.searchParams.get("maxItems"), "maxItems", 500);
    const state = await syncWebsetToStore({
      maxItems,
    });
    let accountSuggestions: unknown = { ok: true, skipped: true, reason: "suggestionLimit=0" };
    const suggestionLimit = parseNonNegativeLimit(
      request.nextUrl.searchParams.get("suggestionLimit"),
      envSuggestionLimit(),
      50,
    );
    if (suggestionLimit > 0 && getOptionalEnv("ACCOUNT_SUGGESTIONS_ON_SYNC") !== "false") {
      try {
        accountSuggestions = await refreshDueAccountSuggestions({
          limit: suggestionLimit,
          staleAfterDays: 7,
        });
      } catch (error) {
        console.error("Account suggestion cron refresh failed", error);
        accountSuggestions = {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown account suggestion refresh error.",
        };
      }
    }
    return NextResponse.json({
      ok: true,
      state,
      accountSuggestions,
    });
  } catch (error) {
    const status = error instanceof Error && error.message.startsWith("Unauthorized") ? 401 : 500;
    return jsonError(error, status);
  }
}
