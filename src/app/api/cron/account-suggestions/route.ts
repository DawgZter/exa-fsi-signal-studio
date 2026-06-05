import { NextRequest, NextResponse } from "next/server";
import { assertSuggestionAuthorized, parseBoundedPositiveInt } from "@/lib/auth";
import { refreshDueAccountSuggestions } from "@/lib/account-suggestions";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function booleanParam(value: string | null): boolean {
  return value === "1" || value === "true";
}

async function run(request: NextRequest): Promise<NextResponse> {
  try {
    assertSuggestionAuthorized(request);
    const limit = parseBoundedPositiveInt(request.nextUrl.searchParams.get("limit"), "limit", 50) ?? 10;
    const staleAfterDays = parseBoundedPositiveInt(request.nextUrl.searchParams.get("staleAfterDays"), "staleAfterDays", 90) ?? 7;
    const domains = request.nextUrl.searchParams
      .getAll("domain")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);
    const result = await refreshDueAccountSuggestions({
      limit,
      staleAfterDays,
      force: booleanParam(request.nextUrl.searchParams.get("force")),
      domains: domains.length ? domains : undefined,
      includeText: !booleanParam(request.nextUrl.searchParams.get("noText")),
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return run(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return run(request);
}
