import { NextRequest, NextResponse } from "next/server";
import { canProvisionLiveStudio } from "@/lib/auth";
import { getOptionalEnv } from "@/lib/env";
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
    const hasExaApiKey = Boolean(getOptionalEnv("EXA_API_KEY"));
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
    const shouldProvisionLive = liveRequested && liveAuthorized && hasExaApiKey;

    const result = await createSignalStudio({
      ...input,
      createProspectWebset: shouldProvisionLive,
    });
    return NextResponse.json(
      {
        ...result,
        liveProvisioning: {
          requested: liveRequested,
          authorized: liveAuthorized,
          provisioned: Boolean(result.studio.prospectWebset),
          mode: result.studio.prospectWebset ? "live" : "preview",
          reason: liveRequested && liveAuthorized && !hasExaApiKey ? "missing_exa_api_key" : undefined,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
