import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getStudio } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  try {
    const { slug } = await context.params;
    const studio = await getStudio(decodeURIComponent(slug));
    if (!studio) {
      return NextResponse.json({ error: "Studio not found" }, { status: 404 });
    }
    return NextResponse.json({ studio });
  } catch (error) {
    return jsonError(error);
  }
}

