import { NextRequest, NextResponse } from "next/server";
import { assertSuggestionAuthorized } from "@/lib/auth";
import { generateAccountSuggestion, getAccountSuggestionBundle } from "@/lib/account-suggestions";
import { HttpError, jsonError, readJsonBody } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RefreshBody = {
  force?: boolean;
  includeText?: boolean;
};

function refreshRequested(request: NextRequest): boolean {
  const value = request.nextUrl.searchParams.get("refresh");
  return value === "1" || value === "true";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> },
): Promise<NextResponse> {
  try {
    const { domain } = await context.params;
    if (refreshRequested(request)) {
      assertSuggestionAuthorized(request);
      const bundle = await generateAccountSuggestion(decodeURIComponent(domain), {
        force: request.nextUrl.searchParams.get("force") === "1" || request.nextUrl.searchParams.get("force") === "true",
      });
      return NextResponse.json(bundle);
    }
    const bundle = await getAccountSuggestionBundle(decodeURIComponent(domain));
    return NextResponse.json(bundle);
  } catch (error) {
    const status = error instanceof Error && error.message.startsWith("Account not found") ? 404 : undefined;
    return jsonError(error, status);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> },
): Promise<NextResponse> {
  try {
    assertSuggestionAuthorized(request);
    const { domain } = await context.params;
    const body = await readJsonBody<RefreshBody | undefined>(request).catch((error) => {
      if (error instanceof HttpError && error.status === 400) {
        return undefined;
      }
      throw error;
    });
    const bundle = await generateAccountSuggestion(decodeURIComponent(domain), {
      force: body?.force,
      includeText: body?.includeText,
    });
    return NextResponse.json(bundle);
  } catch (error) {
    const status = error instanceof Error && error.message.startsWith("Account not found") ? 404 : undefined;
    return jsonError(error, status);
  }
}
