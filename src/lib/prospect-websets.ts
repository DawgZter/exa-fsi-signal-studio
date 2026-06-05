import type { SignalRecord, StudioOption } from "./domain";
import { semanticContextFromSignals, semanticMonitorQuery } from "./semantic-monitor";
import { ExaWebsetsClient } from "./websets";

type ProspectWebsetInput = {
  studioId: string;
  slug: string;
  accountName: string;
  companyDomain: string;
  workflow: string;
  option: StudioOption;
  signals: SignalRecord[];
  createdAt: string;
};

export type ProspectWebsetProvision = {
  websetId: string;
  searchId?: string;
  monitorId?: string;
  dashboardUrl: string;
  createdAt: string;
};

const prospectEnrichmentFields = [
  {
    description: "Best short title for this prospect-facing monitor result.",
    format: "text",
    metadata: { field: "source_title" },
  },
  {
    description: "Name of the company or institution the source is about.",
    format: "text",
    metadata: { field: "account_name" },
  },
  {
    description: "Best available domain for the company or institution the source is about.",
    format: "text",
    metadata: { field: "company_domain" },
  },
  {
    description: "One-sentence reason this result is relevant to the prospect workflow monitor.",
    format: "text",
    metadata: { field: "evidence_summary" },
  },
  {
    description: "Source publication date or page date if available.",
    format: "text",
    metadata: { field: "source_date" },
  },
  {
    description: "Source quality: official, trusted, medium, low, or unknown.",
    format: "text",
    metadata: { field: "source_quality" },
  },
  {
    description: "The relevant workflow, such as AML/KYC, claims, mortgage, wealth/advisor, payments, governance, or research.",
    format: "text",
    metadata: { field: "workflow" },
  },
];

function compactMetadata(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
}

function compactDescription(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 200);
}

function resultId(value: Record<string, unknown> | undefined): string | undefined {
  return typeof value?.id === "string" ? value.id : undefined;
}

function firstNestedId(value: Record<string, unknown>, key: string): string | undefined {
  const nested = value[key];
  if (!Array.isArray(nested)) {
    return undefined;
  }
  const first = nested.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
  return resultId(first);
}

function buildProspectSearchPayload(input: ProspectWebsetInput): Record<string, unknown> {
  const query = semanticMonitorQuery(
    semanticContextFromSignals(input.accountName, input.companyDomain, input.workflow, input.signals),
    input.option.monitorQuery,
  );
  return {
    query,
    count: 8,
    metadata: {
      product: "fsi_signal_studio",
      purpose: "prospect_demo_monitor",
      studio_id: input.studioId,
      studio_slug: input.slug,
      account_domain: input.companyDomain,
      account_name: input.accountName,
      workflow: compactMetadata(input.workflow),
    },
    entity: {
      type: "custom",
      description: compactDescription(
        "Public web evidence for " +
          input.accountName +
          " to monitor, ground, evaluate, or govern " +
          input.workflow +
          " with cited external sources.",
      ),
    },
    criteria: input.option.monitorCriteria.map((description) => ({ description })),
    behavior: "append",
  };
}

function buildProspectWebsetPayload(input: ProspectWebsetInput): Record<string, unknown> {
  return {
    title: input.accountName + " Signal Studio Monitor",
    externalId: "fsi-signal-studio-" + input.slug,
    metadata: {
      product: "fsi_signal_studio",
      purpose: "prospect_demo_monitor",
      studio_id: input.studioId,
      studio_slug: input.slug,
      account_domain: input.companyDomain,
      account_name: input.accountName,
      workflow: compactMetadata(input.workflow),
    },
    enrichments: prospectEnrichmentFields,
    search: buildProspectSearchPayload(input),
  };
}

function buildProspectMonitorPayload(websetId: string, input: ProspectWebsetInput): Record<string, unknown> {
  return {
    websetId,
    cadence: {
      cron: "0 8 * * *",
      timezone: "America/Los_Angeles",
    },
    behavior: {
      type: "search",
      config: buildProspectSearchPayload(input),
    },
    metadata: {
      product: "fsi_signal_studio",
      purpose: "prospect_demo_monitor_daily_refresh",
      studio_id: input.studioId,
      studio_slug: input.slug,
      account_domain: input.companyDomain,
      cadence: "daily",
    },
  };
}

export async function provisionProspectWebset(input: ProspectWebsetInput): Promise<ProspectWebsetProvision> {
  const client = new ExaWebsetsClient();
  const webset = await client.createWebset(buildProspectWebsetPayload(input));
  const websetId = resultId(webset);
  if (!websetId) {
    throw new Error("Exa Websets API did not return a webset id for the generated prospect studio.");
  }

  const monitor = await client.createMonitor(buildProspectMonitorPayload(websetId, input));
  return {
    websetId,
    searchId: firstNestedId(webset, "searches") ?? firstNestedId(webset, "searchesData"),
    monitorId: resultId(monitor),
    dashboardUrl: "https://websets.exa.ai/websets/" + websetId,
    createdAt: input.createdAt,
  };
}
