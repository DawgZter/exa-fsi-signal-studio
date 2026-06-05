import { config } from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import { getOptionalEnv } from "../src/lib/env";
import { signalLanes } from "../src/lib/lanes";
import { ExaWebsetsClient } from "../src/lib/websets";

config({ path: ".env.local" });

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const enrichmentFields = [
  {
    description:
      "Name of the target financial-services buyer/operator represented by this signal. Use NOT_FSI_TARGET if only a vendor, consultancy, cloud provider, association, event organizer, or publisher is named.",
    format: "text",
    metadata: { field: "account_name" },
  },
  {
    description:
      "Best available domain for the target financial-services buyer/operator, not the publisher/vendor domain. Use NOT_FSI_TARGET if no target FSI company is named.",
    format: "text",
    metadata: { field: "company_domain" },
  },
  {
    description:
      "Target account FSI subsector: Banking, Credit Union, Insurance, Wealth/RIA, Payments, Lending/Mortgage, Fraud/Risk, Regtech, Core Banking, Capital Markets Ops, Pension, Exchange/Broker, or unknown.",
    format: "text",
    metadata: { field: "fsi_subsector" },
  },
  {
    description: "Short signal type label, such as customer_ai_assistant, official_agent_launch, ai_hiring, governance_model_risk, or vendor_partner_announcement.",
    format: "text",
    metadata: { field: "signal_type" },
  },
  {
    description: "Source quality: official, trusted, medium, low, or unknown.",
    format: "text",
    metadata: { field: "source_quality" },
  },
  {
    description: "Best available source publication date or page date.",
    format: "text",
    metadata: { field: "source_date" },
  },
  {
    description:
      "Concise evidence summary explaining why this is an AI-agent signal for the named financial-services buyer/operator. Say if the page is vendor-only.",
    format: "text",
    metadata: { field: "evidence_summary" },
  },
  {
    description: "The affected FSI workflow, such as AML/KYC, claims, mortgage, wealth/advisor, payments, post-trade, support, governance, or research.",
    format: "text",
    metadata: { field: "workflow" },
  },
  {
    description: "Confidence label for using this as an outbound signal: high, medium, or low, plus a short reason.",
    format: "text",
    metadata: { field: "confidence_reason" },
  },
  {
    description: "One sentence connecting this signal to Exa external retrieval, citations, freshness, or monitoring.",
    format: "text",
    metadata: { field: "why_exa_matters" },
  },
];

const signalEntityDescription =
  "Public FSI signal that a company is building, buying, hiring for, launching, or governing AI agents, assistants, copilots, or agentic workflows.";

function buildSearchPayload(laneId: string) {
  const lane = signalLanes.find((item) => item.id === laneId);
  if (!lane) {
    throw new Error(`Unknown lane: ${laneId}`);
  }

  return {
    query: lane.defaultSearch,
    count: lane.primary ? 20 : 10,
    metadata: {
      lane_id: lane.id,
      lane_label: lane.label,
      product: "fsi_signal_studio",
    },
    entity: {
      type: "custom",
      description: signalEntityDescription,
    },
    criteria: lane.criteria.map((description) => ({ description })),
    behavior: "append",
  };
}

function buildMonitorPayload(websetId: string, laneId: string, index: number) {
  const lane = signalLanes.find((item) => item.id === laneId);
  if (!lane) {
    throw new Error(`Unknown lane: ${laneId}`);
  }

  return {
    websetId,
    cadence: {
      cron: `0 ${7 + index} * * *`,
      timezone: "America/Los_Angeles",
    },
    behavior: {
      type: "search",
      config: buildSearchPayload(laneId),
    },
    metadata: {
      lane_id: lane.id,
      lane_label: lane.label,
      product: "fsi_signal_studio",
      cadence: "daily",
    },
  };
}

function buildBroadDailyMonitorPayload(websetId: string) {
  return {
    websetId,
    cadence: {
      cron: "0 7 * * *",
      timezone: "America/Los_Angeles",
    },
    behavior: {
      type: "search",
      config: {
        query:
          "Financial services companies with public signals that they are building, buying, hiring for, launching, partnering on, discussing, or governing AI agents, AI assistants, copilots, agentic AI platforms, RAG systems, or source-grounded AI workflows. Target accounts must be banks, insurers, lenders, asset managers, wealth firms, payments companies, exchanges, brokers, pension funds, credit unions, regulators, or public financial institutions.",
        count: 40,
        entity: {
          type: "custom",
          description: signalEntityDescription,
        },
        criteria: [
          {
            description:
              "Names the target account as a financial-services company, financial institution, bank, credit union, fintech operator, insurer, asset manager, wealth firm, payments company, lender, exchange, broker, pension fund, regulator, or public financial institution.",
          },
          {
            description: "Describes AI agents, AI assistants, copilots, agentic AI platforms, RAG, AI workflow automation, AI governance, or AI hiring related to financial-services workflows.",
          },
          {
            description: "Contains source-backed public evidence that can be used by an AE for outbound prospecting or a prospect-specific Exa demo page.",
          },
          {
            description: "Relates to at least one FSI workflow such as banking support, AML/KYC, fraud, claims, mortgage, lending, wealth/advisor, payments, post-trade, governance, compliance, or research.",
          },
          {
            description:
              "Reject items where the only account is an AI vendor, consultant, cloud provider, software implementation partner, association, event organizer, publisher, analyst firm, or generic technology company.",
          },
        ],
        behavior: "append",
      },
    },
    metadata: {
      product: "fsi_signal_studio",
      cadence: "daily",
      lane_id: "broad_daily_refresh",
      lane_label: "Broad Daily FSI Agent Signal Refresh",
    },
  };
}

function buildBroadDailyMonitorUpdatePayload(websetId: string) {
  const { websetId: _websetId, ...payload } = buildBroadDailyMonitorPayload(websetId);
  return payload;
}

async function writeWebsetIdToEnv(websetId: string): Promise<void> {
  const envPath = ".env.local";
  let current = "";
  try {
    current = await readFile(envPath, "utf8");
  } catch {
    current = "";
  }
  const lines = current
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith("EXA_WEBSET_ID="));
  lines.push(`EXA_WEBSET_ID=${websetId}`);
  await writeFile(envPath, `${lines.join("\n")}\n`, "utf8");
}

function buildWebsetPayload(firstLane?: string) {
  const externalId = `fsi-signal-studio-${new Date().toISOString().slice(0, 10)}`;
  return {
    title: "FSI AI Agent Signals",
    externalId,
    metadata: {
      product: "fsi_signal_studio",
      created_by: "local_automation",
      purpose: "Live source-backed FSI AI-agent adoption signals for AE outbound demo generation.",
    },
    enrichments: enrichmentFields,
    ...(firstLane ? { search: buildSearchPayload(firstLane) } : {}),
  };
}

const laneArg = getArg("--lane");
const lanes = laneArg ? laneArg.split(",").map((lane) => lane.trim()) : signalLanes.map((lane) => lane.id);
const createWebset = hasFlag("--create-webset");
const createMonitors = hasFlag("--create-monitors");
const createBroadMonitor = hasFlag("--create-broad-monitor");
const updateBroadMonitor = hasFlag("--update-broad-monitor");
const shouldCreateSearches = !updateBroadMonitor || hasFlag("--create-searches") || createWebset;
const websetSeedLane = createWebset ? lanes[0] : undefined;
const websetPayload = createWebset ? buildWebsetPayload(websetSeedLane) : undefined;
const payloads = lanes.map((lane) => ({ lane, payload: buildSearchPayload(lane) }));

if (!hasFlag("--apply")) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        websetPayload,
        payloads,
        broadMonitorPayload: createBroadMonitor || updateBroadMonitor ? buildBroadDailyMonitorPayload("WEBSET_ID") : undefined,
        monitorPayloads: createMonitors ? lanes.map((lane, index) => ({ lane, payload: buildMonitorPayload("WEBSET_ID", lane, index) })) : [],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

let websetId = getArg("--webset-id") ?? getOptionalEnv("EXA_WEBSET_ID");
const client = new ExaWebsetsClient();
let webset: Record<string, unknown> | undefined;

if (createWebset) {
  webset = await client.createWebset(buildWebsetPayload(websetSeedLane));
  websetId = String(webset.id);
  if (hasFlag("--write-env")) {
    await writeWebsetIdToEnv(websetId);
  }
}

if (!websetId) {
  throw new Error("Missing EXA_WEBSET_ID. Pass --webset-id or set it in the environment.");
}

const created = [];
if (shouldCreateSearches) {
  for (const { lane, payload } of payloads.filter((item) => !(createWebset && item.lane === websetSeedLane))) {
    const result = await client.createSearch(websetId, payload);
    created.push({ lane, result });
  }
}

const monitors = [];
if (createMonitors) {
  for (const [index, lane] of lanes.entries()) {
    const result = await client.createMonitor(buildMonitorPayload(websetId, lane, index));
    monitors.push({ lane, result });
  }
}

if (createBroadMonitor) {
  const result = await client.createMonitor(buildBroadDailyMonitorPayload(websetId));
  monitors.push({ lane: "broad_daily_refresh", result });
}

if (updateBroadMonitor) {
  const currentWebset = await client.getWebset(websetId);
  const broadMonitor = (Array.isArray(currentWebset.monitors) ? currentWebset.monitors : []).find((monitor) => {
    if (!monitor || typeof monitor !== "object") {
      return false;
    }
    const record = monitor as Record<string, unknown>;
    const metadata = record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>) : {};
    return metadata.lane_id === "broad_daily_refresh";
  }) as Record<string, unknown> | undefined;
  const monitorId = typeof broadMonitor?.id === "string" ? broadMonitor.id : undefined;
  if (!monitorId) {
    throw new Error("Could not find existing broad_daily_refresh monitor on the Webset.");
  }
  const result = await client.updateMonitor(monitorId, buildBroadDailyMonitorUpdatePayload(websetId));
  monitors.push({ lane: "broad_daily_refresh", result });
}

console.log(JSON.stringify({ mode: "apply", webset, websetId, created, monitors }, null, 2));
