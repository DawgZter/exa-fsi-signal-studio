import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getAccountSuggestionBundle } from "./account-suggestions";
import { buildAccounts } from "./accounts";
import { signalStudioSchema, type SignalRecord, type SignalStudio, type StudioOption } from "./domain";
import { getAppBaseUrl } from "./env";
import { normalizeDomain, prospectLogoUrl } from "./logo";
import { provisionProspectWebset } from "./prospect-websets";
import { semanticContextFromSignals, semanticMonitorQuery } from "./semantic-monitor";
import { readSignals, upsertStudio } from "./store";

export const createStudioInputSchema = z.object({
  accountDomain: z.string().min(1),
  signalIds: z.array(z.string()).optional(),
  workflowOverride: z.string().optional(),
  repNote: z.string().optional(),
  createdBy: z.string().optional(),
  createProspectWebset: z.boolean().optional(),
  optionId: z.string().optional(),
});

export type CreateStudioInput = z.infer<typeof createStudioInputSchema>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function stableId(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function inferWorkflow(signals: SignalRecord[]): string {
  const explicit = signals.find((signal) => signal.workflow)?.workflow;
  if (explicit) {
    return explicit;
  }
  const joined = signals.map((signal) => `${signal.signalType} ${signal.evidenceSummary}`).join(" ").toLowerCase();
  if (joined.includes("aml") || joined.includes("kyc") || joined.includes("financial crime")) {
    return "Financial-crimes investigation and compliance";
  }
  if (joined.includes("claim") || joined.includes("insurance")) {
    return "Claims evidence and regulatory monitoring";
  }
  if (joined.includes("mortgage") || joined.includes("lending") || joined.includes("underwriting")) {
    return "Mortgage, lending, and underwriting guidance";
  }
  if (joined.includes("wealth") || joined.includes("advisor")) {
    return "Wealth and advisor intelligence";
  }
  return "Regulated agent workflow grounding";
}

function buildOptions(accountName: string, domain: string, workflow: string, signals: SignalRecord[]): StudioOption[] {
  const signalTerms = Array.from(new Set(signals.map((signal) => signal.signalType).filter(Boolean)))
    .slice(0, 4)
    .map((term) => term.replace(/[_-]+/g, " ").trim());
  const accountNeed = signalTerms.length ? signalTerms.join(", ") : "AI-agent adoption";

  return [
    {
      id: "grounding-monitor",
      title: `${workflow} Grounding Webset`,
      workflow,
      audience: "AI platform lead / business workflow owner",
      monitorQuery: semanticMonitorQuery(semanticContextFromSignals(accountName, domain, workflow, signals)),
      monitorCriteria: [
        `Sources must mention ${accountName} or ${domain}.`,
        "Sources must relate to the selected financial-services workflow.",
        "Sources must include current external web evidence that could ground, update, or challenge an AI agent.",
      ],
      valueProposition: `Keeps ${accountName}'s ${workflow.toLowerCase()} agents grounded in fresh, cited external intelligence.`,
    },
    {
      id: "auditability-pack",
      title: "Auditability And Source Pack",
      workflow,
      audience: "Model-risk / compliance owner",
      monitorQuery: semanticMonitorQuery({
        ...semanticContextFromSignals(accountName, domain, workflow, signals),
        evidenceSummaries: ["controls, governance, auditability, compliance, and source provenance"],
      }),
      monitorCriteria: [
        "Sources must discuss controls, governance, auditability, compliance, or source provenance.",
        "Sources must be official, trusted trade press, regulator-adjacent, or named vendor/customer evidence.",
        "Results must be usable in a human-reviewed evidence pack.",
      ],
      valueProposition: `Shows how Exa can provide cited public-web evidence for regulated AI-agent review and governance.`,
    },
    {
      id: "competitive-agent-watch",
      title: "Competitive Agent Adoption Watch",
      workflow,
      audience: "Innovation / strategy lead",
      monitorQuery: semanticMonitorQuery({
        ...semanticContextFromSignals(accountName, domain, workflow, signals),
        evidenceSummaries: ["peer AI-agent launches, hiring, governance, partner activity, and market announcements"],
      }),
      monitorCriteria: [
        "Sources must name the account, a peer, or an FSI-infrastructure vendor.",
        "Sources must describe AI-agent launches, hiring, governance, or partner activity.",
        "Results must include citations and dated source context.",
      ],
      valueProposition: `Turns ${accountNeed} signals into a live watchlist for the buyer's exact market context.`,
    },
  ];
}

export async function createSignalStudio(input: CreateStudioInput): Promise<{ studio: SignalStudio; url: string }> {
  const parsed = createStudioInputSchema.parse(input);
  const signals = await readSignals();
  const accountDomain = normalizeDomain(parsed.accountDomain);
  const accountSignals = signals.filter((signal) => normalizeDomain(signal.companyDomain) === accountDomain);
  if (!accountSignals.length) {
    throw new Error(`No signals found for account domain: ${parsed.accountDomain}`);
  }

  const selectedSignals = (parsed.signalIds?.length
    ? accountSignals.filter((signal) => parsed.signalIds?.includes(signal.id))
    : accountSignals.slice(0, 8)).slice(0, 8);
  if (!selectedSignals.length) {
    throw new Error("None of the requested signalIds belong to the selected account.");
  }

  const account = buildAccounts(accountSignals)[0];
  const accountSuggestionBundle = parsed.workflowOverride?.trim()
    ? undefined
    : await getAccountSuggestionBundle(account.companyDomain);
  const suggestionOption = parsed.optionId
    ? accountSuggestionBundle?.options.find((option) => option.id === parsed.optionId)
    : accountSuggestionBundle?.options[0];
  const workflow = parsed.workflowOverride?.trim() || suggestionOption?.workflow || inferWorkflow(selectedSignals);
  const fallbackOptions = buildOptions(account.accountName, account.companyDomain, workflow, selectedSignals);
  const accountSuggestionOptions = accountSuggestionBundle?.options ?? [];
  const orderedSuggestionOptions = suggestionOption
    ? [suggestionOption, ...accountSuggestionOptions.filter((option) => option.id !== suggestionOption.id)]
    : accountSuggestionOptions;
  const options = orderedSuggestionOptions.length
    ? [...orderedSuggestionOptions, ...fallbackOptions.filter((option) => !orderedSuggestionOptions.some((item) => item.id === option.id))]
    : fallbackOptions;
  const now = new Date().toISOString();
  const slug = `${slugify(account.accountName)}-${nanoid(8)}`;
  const studioId = `studio_${stableId(`${slug}:${now}`)}`;
  const prospectWebset = parsed.createProspectWebset === false
    ? undefined
    : await provisionProspectWebset({
        studioId,
        slug,
        accountName: account.accountName,
        companyDomain: account.companyDomain,
        workflow,
        option: options[0],
        signals: selectedSignals,
        createdAt: now,
      });

  const studio = signalStudioSchema.parse({
    id: studioId,
    slug,
    accountName: account.accountName,
    companyDomain: account.companyDomain,
    prospectLogoUrl: prospectLogoUrl(account.companyDomain),
    selectedSignalIds: selectedSignals.map((signal) => signal.id),
    studioName: `${account.accountName} Signal Studio`,
    selectedWorkflow: workflow,
    generatedBrief: `${account.accountName} is showing live, source-backed evidence related to ${workflow.toLowerCase()}. This studio turns those signals into a cited external-intelligence Webset an AE can share in outbound to show how Exa would ground the account's real AI-agent workflow.`,
    monitorQuery: options[0].monitorQuery,
    monitorCriteria: options[0].monitorCriteria,
    prospectWebset,
    options,
    sourcePack: selectedSignals.map((signal) => ({
      signalId: signal.id,
      title: signal.sourceTitle,
      url: signal.sourceUrl,
      sourceDomain: signal.sourceDomain,
      sourceDate: signal.sourceDate,
      confidence: signal.confidence,
      evidenceSummary: signal.evidenceSummary,
    })),
    createdAt: now,
    updatedAt: now,
    createdBy: parsed.createdBy ?? "agent",
    repNote: parsed.repNote,
  });

  await upsertStudio(studio);
  return {
    studio,
    url: `${getAppBaseUrl().replace(/\/$/, "")}/studio/${studio.slug}`,
  };
}
