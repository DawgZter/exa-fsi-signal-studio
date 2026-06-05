import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as createStudioRoute } from "@/app/api/studios/route";
import { buildAccounts } from "./accounts";
import { assertSyncAuthorized, canProvisionLiveStudio } from "./auth";
import { toClientSignal } from "./client-signals";
import { signalTypeLabel } from "./format";
import { getProspectWebsetResults } from "./prospect-results";
import { looksLikeKeywordFilter, semanticMonitorQuery, sanitizeProspectWebsetSuggestion } from "./semantic-monitor";
import {
  normalizeCorrected,
  normalizeProspectWebsetSuggestion,
  rowHash,
  signalReviewBatchResponseSchema,
} from "./signal-review-context";
import type { SignalRecord, SignalStudio } from "./domain";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function signal(overrides: Partial<SignalRecord>): SignalRecord {
  return {
    id: "sig_" + (overrides.signalType ?? "base"),
    websetId: "webset_test",
    accountName: "Bank of America",
    companyDomain: "bankofamerica.com",
    accountSegment: "Strategic Enterprise",
    territory: "North America",
    fsiSubsector: "Banking",
    lane: "customer_ai_assistants",
    signalType: "employee_facing_ai_assistant",
    sourceType: "official",
    sourceQuality: "official",
    sourceUrl: "https://bankofamerica.com/news/ai",
    sourceTitle: "AI update",
    sourceDomain: "bankofamerica.com",
    sourceDate: "2026-05-01",
    discoveredAt: "2026-06-01T00:00:00.000Z",
    evidenceSummary: "Bank of America is using AI assistants in regulated workflows.",
    confidence: "high",
    suggestedDemoOptions: [],
    buyerPersonas: [],
    tags: [],
    ...overrides,
  };
}

function studio(overrides: Partial<SignalStudio> = {}): SignalStudio {
  return {
    id: "studio_test",
    slug: "example-bank-ai-risk",
    accountName: "Example Bank",
    companyDomain: "examplebank.com",
    selectedSignalIds: ["sig_source"],
    studioName: "Example Bank Signal Studio",
    selectedWorkflow: "AML/KYC AI risk",
    generatedBrief: "A generated prospect brief.",
    monitorQuery: "Find current public web evidence Example Bank can use to monitor AML/KYC AI risk.",
    monitorCriteria: ["Relevant to AML/KYC", "Includes AI agents", "Comes from cited public web"],
    options: [],
    sourcePack: [
      {
        signalId: "sig_source",
        title: "Internal source-pack preview",
        url: "https://examplebank.com/ai",
        sourceDomain: "examplebank.com",
        sourceDate: "2026-05-01",
        confidence: "high",
        evidenceSummary: "Example Bank has an internal source-pack signal about AI risk.",
      },
    ],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    createdBy: "agent",
    ...overrides,
  };
}

describe("account aggregation", () => {
  it("keeps account-level lanes and signal types separate", () => {
    const accounts = buildAccounts([
      signal({ id: "sig_ai_hiring", signalType: "ai_hiring" }),
      signal({ id: "sig_governance", signalType: "governance_model_risk" }),
    ]);

    expect(accounts).toHaveLength(1);
    expect(accounts[0].signalLanesSeen).toEqual(["customer_ai_assistants"]);
    expect(accounts[0].allSignalTypesSeen).toEqual(["ai_hiring", "governance_model_risk"]);
  });
});

describe("formatting", () => {
  it("humanizes compact signal type labels", () => {
    expect(signalTypeLabel("aml_kyc_rag_workflow")).toBe("AML KYC RAG Workflow");
    expect(signalTypeLabel("employee-facing-ai-assistant")).toBe("Employee Facing AI Assistant");
  });
});

describe("Exa Answer row review parsing", () => {
  it("normalizes alias-heavy prospect Webset suggestions", () => {
    const parsed = signalReviewBatchResponseSchema.parse({
      reviews: [
        {
          signalId: "sig_ai_hiring",
          status: "approved",
          accuracyScore: 0.95,
          outboundUsefulnessScore: 86,
          rationale: "Official account signal with a credible prospect-facing monitor.",
          corrected: {
            accountName: null,
            companyDomain: null,
            lane: null,
            signalType: null,
            confidence: null,
            sourceQuality: null,
            fsiSubsector: null,
            workflow: null,
          },
          prospectWebsetSuggestion: {
            score: "0.82",
            websetTitle: "Mortgage AI Monitor",
            buyerPersona: "Mortgage operations leader",
            query: "mortgage lender AI underwriting assistants regulatory guidance",
            criteria: ["Mortgage workflow", "AI or automation", "Cited public source"],
            rationale: "This would monitor external evidence for a lending workflow.",
          },
          issues: [],
        },
      ],
    });

    const review = parsed.reviews[0];
    expect(review.prospectWebsetSuggestion?.fitScore).toBe(82);
    expect(review.prospectWebsetSuggestion?.title).toBe("Mortgage AI Monitor");
    expect(normalizeCorrected(review)).toEqual({});
    expect(normalizeProspectWebsetSuggestion(review)?.monitorCriteria).toHaveLength(3);
  });

  it("hashes only stable signal-review fields", () => {
    const original = signal({ id: "sig_hash", raw: { volatile: "a" } });
    const changedRaw = signal({ id: "sig_hash", raw: { volatile: "b" } });

    expect(rowHash(original)).toBe(rowHash(changedRaw));
  });
});

describe("prospect Webset semantic query safety", () => {
  it("rewrites boolean and site-filter monitor queries into semantic Exa instructions", () => {
    const query = semanticMonitorQuery(
      {
        accountName: "Citigroup",
        companyDomain: "citigroup.com",
        workflow: "Wealth and advisor intelligence",
        signalTypes: ["Citi Sky", "Gemini Enterprise Agent Platform"],
        evidenceSummaries: ["Citi is launching AI-powered wealth workflows."],
      },
      'site:citigroup.com ("Citi Sky" OR "Citi Wealth" OR "AI-powered") (launch OR unveiled)',
    );

    expect(looksLikeKeywordFilter('site:citigroup.com ("Citi Sky" OR "AI-powered")')).toBe(true);
    expect(query).toContain("Find current public web evidence");
    expect(query).toContain("Citigroup");
    expect(query).not.toMatch(/site:|\bOR\b|[()]/);
  });

  it("sanitizes Exa Answer suggestions before studio creation can use them", () => {
    const suggestion = sanitizeProspectWebsetSuggestion(
      {
        fitScore: 90,
        workflow: "Payments AI operations",
        title: "Payments Agent Monitor",
        audience: "Payments operations leader",
        monitorQuery: 'site:examplebank.com ("payments" OR "agentic AI")',
        monitorCriteria: ["Payments workflow", "AI-related source"],
        valueProposition: "Monitor payments-agent evidence.",
        rationale: "Useful for regulated payments workflows.",
      },
      {
        accountName: "Example Bank",
        companyDomain: "examplebank.com",
        workflow: "Payments AI operations",
        signalTypes: ["payments_agent"],
      },
    );

    expect(suggestion.monitorQuery).not.toMatch(/site:|\bOR\b|[()]/);
    expect(suggestion.monitorQuery).toContain("Example Bank");
  });
});

describe("prospect Webset results", () => {
  it("falls back to source-pack preview when the live Webset is not accessible", async () => {
    vi.stubEnv("EXA_API_KEY", "");

    const result = await getProspectWebsetResults(
      studio({
        prospectWebset: {
          websetId: "webset_seed",
          dashboardUrl: "https://websets.exa.ai/websets/webset_seed",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      }),
    );

    expect(result.status).toBe("preview");
    expect(result.results[0]).toMatchObject({
      title: "Internal source-pack preview",
      evidenceSummary: "Example Bank has an internal source-pack signal about AI risk.",
    });
  });

  it("maps live prospect Webset enrichments into result cards", async () => {
    vi.stubEnv("EXA_API_KEY", "test-exa-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        if (href.includes("/items")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "item_live",
                  url: "https://examplebank.com/agent-risk",
                  enrichments: [
                    { enrichmentId: "enrich_title", result: "Agent Risk Evidence" },
                    { enrichmentId: "enrich_summary", result: "Example Bank has public AML/KYC AI-agent evidence." },
                    { enrichmentId: "enrich_workflow", result: "AML/KYC AI risk" },
                    { enrichmentId: "enrich_domain", result: "examplebank.com" },
                    { enrichmentId: "enrich_account", result: "Example Bank" },
                  ],
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            id: "webset_live",
            status: "completed",
            enrichments: [
              { id: "enrich_title", metadata: { field: "source_title" } },
              { id: "enrich_summary", metadata: { field: "evidence_summary" } },
              { id: "enrich_workflow", metadata: { field: "workflow" } },
              { id: "enrich_domain", metadata: { field: "company_domain" } },
              { id: "enrich_account", metadata: { field: "account_name" } },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const result = await getProspectWebsetResults(
      studio({
        prospectWebset: {
          websetId: "webset_live",
          dashboardUrl: "https://websets.exa.ai/websets/webset_live",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      }),
    );

    expect(result.status).toBe("live");
    expect(result.results[0]).toMatchObject({
      title: "Agent Risk Evidence",
      evidenceSummary: "Example Bank has public AML/KYC AI-agent evidence.",
      workflow: "AML/KYC AI risk",
      accountName: "Example Bank",
      companyDomain: "examplebank.com",
    });
  });
});

describe("public API safety", () => {
  it("redacts raw and internal Webset routing fields from client signals", () => {
    const clientSignal = toClientSignal(
      signal({
        raw: { secretShape: "full-webset-item" },
        websetId: "webset_123",
        websetItemId: "item_123",
        searchId: "search_123",
        monitorId: "monitor_123",
      }),
    );

    expect(clientSignal.id).toBeDefined();
    expect("raw" in clientSignal).toBe(false);
    expect("websetId" in clientSignal).toBe(false);
    expect("websetItemId" in clientSignal).toBe(false);
    expect("searchId" in clientSignal).toBe(false);
    expect("monitorId" in clientSignal).toBe(false);
  });

  it("requires a live creation passcode for live studio provisioning when one is configured", () => {
    vi.stubEnv("STUDIO_ADMIN_SECRET", "live-creation-passcode");

    expect(canProvisionLiveStudio(new Request("https://example.com"))).toBe(false);
    expect(
      canProvisionLiveStudio(
        new Request("https://example.com", {
          headers: { "x-studio-secret": "live-creation-passcode" },
        }),
      ),
    ).toBe(true);
  });

  it("allows live studio provisioning outside production when no passcode is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STUDIO_ADMIN_SECRET", "");

    expect(canProvisionLiveStudio(new Request("https://example.com"))).toBe(true);
  });

  it("does not silently downgrade unauthorized live studio creation to preview", async () => {
    vi.stubEnv("STUDIO_ADMIN_SECRET", "live-creation-passcode");

    const response = await createStudioRoute(
      new NextRequest("https://example.com/api/studios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountDomain: "bankofamerica.com",
          createProspectWebset: true,
        }),
      }),
    );
    const body = (await response.json()) as {
      error?: string;
      liveProvisioning?: { requested: boolean; authorized: boolean; provisioned: boolean; mode: string };
    };

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/live creation passcode/i);
    expect(body.liveProvisioning).toEqual({
      requested: true,
      authorized: false,
      provisioned: false,
      mode: "unauthorized",
    });
  });

  it("fails closed for production sync when no sync secret is configured", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => assertSyncAuthorized(new Request("https://example.com/api/sync"))).toThrow(
      /Unauthorized sync request/,
    );
  });

  it("allows sync with the configured bearer secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SYNC_SECRET", "sync-secret");

    expect(() =>
      assertSyncAuthorized(
        new Request("https://example.com/api/sync", {
          headers: { authorization: "Bearer sync-secret" },
        }),
      ),
    ).not.toThrow();
  });
});
