import { NextRequest, NextResponse } from "next/server";
import { assertSyncAuthorized, parseBoundedPositiveInt } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { syncWebsetToStore } from "@/lib/sync";
import { readSyncState } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await readSyncState());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSyncAuthorized(request);
    const maxItems = parseBoundedPositiveInt(request.nextUrl.searchParams.get("maxItems"), "maxItems", 500);
    const state = await syncWebsetToStore({
      maxItems,
    });
    return NextResponse.json(state);
  } catch (error) {
    return jsonError(error);
  }
}
