import { NextRequest, NextResponse } from "next/server";
import { canProvisionLiveStudio } from "@/lib/auth";
import { createSignalStudio, createStudioInputSchema } from "@/lib/studios";
import { HttpError, jsonError, readJsonBody } from "@/lib/http";
import { readStudios } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const studios = await readStudios();
    return NextResponse.json({ studios, count: studios.length });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await readJsonBody<unknown>(request);
    const parsed = createStudioInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError("Invalid studio creation request.", 400);
    }
    const input = parsed.data;
    const liveRequested = input.createProspectWebset !== false;
    const liveAuthorized = liveRequested && canProvisionLiveStudio(request);
    if (liveRequested && !liveAuthorized) {
      return NextResponse.json(
        {
          error:
            "Live prospect Webset provisioning requires a valid live creation passcode, not an Exa API key. Local installs can leave the field blank when no passcode is configured; hosted deployments must configure a private STUDIO_ADMIN_SECRET. Send x-studio-secret or explicitly set createProspectWebset to false for preview mode.",
          liveProvisioning: {
            requested: true,
            authorized: false,
            provisioned: false,
            mode: "unauthorized",
          },
        },
        { status: 401 },
      );
    }

    const result = await createSignalStudio({
      ...input,
      createProspectWebset: liveRequested,
    });
    return NextResponse.json(
      {
        ...result,
        liveProvisioning: {
          requested: liveRequested,
          authorized: liveAuthorized,
          provisioned: Boolean(result.studio.prospectWebset),
          mode: result.studio.prospectWebset ? "live" : "preview",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
