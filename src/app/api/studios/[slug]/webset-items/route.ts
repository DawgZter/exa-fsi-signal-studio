import { NextRequest, NextResponse } from "next/server";
import { parseBoundedPositiveInt } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getProspectWebsetResults } from "@/lib/prospect-results";
import { getStudio } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  try {
    const { slug } = await context.params;
    const studio = await getStudio(decodeURIComponent(slug));
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    const maxItems = parseBoundedPositiveInt(request.nextUrl.searchParams.get("maxItems"), "maxItems", 50) ?? 30;
    const result = await getProspectWebsetResults(studio, { maxItems });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
