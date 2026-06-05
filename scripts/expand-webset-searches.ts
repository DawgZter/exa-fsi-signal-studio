import { config } from "dotenv";
import { getOptionalEnv } from "../src/lib/env";
import type { SignalLane } from "../src/lib/domain";
import { ExaWebsetsClient } from "../src/lib/websets";

config({ path: ".env.local" });

type ExpansionSearch = {
  id: string;
  lane: SignalLane;
  query: string;
  count: number;
  criteria: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const signalEntityDescription =
  "Public FSI signal that a company is building, buying, hiring for, launching, or governing AI agents, assistants, copilots, or agentic workflows.";

const commonCriteria = [
  "Target account must be a named financial-services buyer/operator, and account_name/company_domain must be that FSI account rather than a vendor, publisher, event organizer, analyst, consultant, cloud provider, job board, or portal.",
  "Must include source-backed evidence about AI agents, AI assistants, copilots, agentic AI, GenAI workflow automation, RAG, semantic search, AI governance, or AI hiring tied to a financial-services workflow; reject vendor-only or generic market commentary.",
];

const searches: ExpansionSearch[] = [
  {
    id: "na_banks_credit_unions_hiring",
    lane: "job_posts_hiring",
    count: 35,
    query:
      "US and Canadian banks, regional banks, community banks, and credit unions hiring for AI agents, agentic AI, generative AI platforms, RAG, LangChain, LangGraph, AI copilots, AI governance, fraud AI, or customer service AI.",
    criteria: [
      "Source should be an official career page, job post, company hiring page, or credible job listing attributable to the bank or credit union.",
      "Hiring company must be the financial institution, not a consulting firm or vendor serving banks.",
      "Prefer roles tied to banking operations, branch/contact-center support, fraud, compliance, lending, wealth, data platforms, or governance.",
    ],
  },
  {
    id: "banking_customer_employee_assistants",
    lane: "customer_ai_assistants",
    count: 35,
    query:
      "Banks and credit unions launching customer AI assistants, employee copilots, banker assistants, contact-center AI agents, branch AI assistants, fraud assistants, account-servicing copilots, or digital banking AI agents.",
    criteria: [
      "Target account must be the bank or credit union launching or using the assistant.",
      "Evidence should describe a customer-facing, employee-facing, or operations-facing AI assistant/copilot/agent.",
      "Prefer official announcements, credible banking trade coverage, or named customer stories.",
    ],
  },
  {
    id: "insurance_claims_underwriting_agents",
    lane: "customer_ai_assistants",
    count: 35,
    query:
      "Insurance carriers and brokers launching or hiring for AI agents, AI claims assistants, underwriting copilots, policy servicing assistants, claims automation, agentic AI, RAG, or generative AI governance.",
    criteria: [
      "Target account must be an insurer, reinsurer, insurance broker, or regulated insurance organization.",
      "Signal must relate to claims, underwriting, policy servicing, broker/advisor support, compliance, fraud, or customer support.",
      "Reject insurtech event pages or vendor product pages unless they name a carrier/broker customer as the account.",
    ],
  },
  {
    id: "mortgage_lending_agents",
    lane: "customer_ai_assistants",
    count: 30,
    query:
      "Mortgage lenders, loan servicers, consumer lenders, SMB lenders, and credit providers using or hiring for AI agents, mortgage AI assistants, loan origination copilots, underwriting AI, RAG, GenAI, or lending workflow automation.",
    criteria: [
      "Target account must be the lender, servicer, mortgage company, credit provider, or financial institution.",
      "Signal must connect to origination, underwriting, servicing, borrower support, document processing, risk, or compliance.",
      "Reject generic mortgage AI vendors unless a lender customer is named as the account.",
    ],
  },
  {
    id: "wealth_asset_research_agents",
    lane: "official_ai_agent_launches",
    count: 35,
    query:
      "Asset managers, wealth managers, RIAs, private banks, investment managers, and pension funds using AI agents, research copilots, advisor assistants, investment research AI, RAG, semantic search, or GenAI platforms.",
    criteria: [
      "Target account must be the asset manager, wealth firm, private bank, RIA, pension fund, or investment manager.",
      "Signal should relate to advisor prep, investment research, client servicing, market intelligence, portfolio operations, governance, or knowledge retrieval.",
      "Prefer official posts, annual reports, credible trade articles, job posts, or named customer stories.",
    ],
  },
  {
    id: "payments_fraud_kyc_agents",
    lane: "customer_ai_assistants",
    count: 35,
    query:
      "Payments companies, card networks, fintech operators, neobanks, and money movement firms using AI agents, fraud AI agents, AML KYC copilots, dispute automation, payments intelligence, GenAI, or agentic commerce controls.",
    criteria: [
      "Target account must be a regulated fintech, payments company, card network, neobank, money movement firm, or financial-crime operator.",
      "Signal must relate to fraud, AML/KYC, disputes, onboarding, payments operations, customer support, transaction monitoring, or risk.",
      "Reject generic AI or cloud-provider pages unless a target payments/fintech account is named.",
    ],
  },
  {
    id: "capital_markets_post_trade_agents",
    lane: "official_ai_agent_launches",
    count: 35,
    query:
      "Exchanges, brokerages, market infrastructure firms, clearing houses, trading platforms, and capital markets firms using AI agents, research agents, post-trade automation, reconciliation AI, market surveillance AI, RAG, or GenAI copilots.",
    criteria: [
      "Target account must be an exchange, brokerage, clearing house, market infrastructure firm, trading platform, or capital-markets financial institution.",
      "Signal should relate to research, trading operations, post-trade, reconciliation, market surveillance, compliance, customer workflows, or internal productivity.",
      "Reject generic software vendors unless the named account is a capital-markets operator.",
    ],
  },
  {
    id: "europe_uk_fsi_agentic_ai",
    lane: "ai_leadership_team",
    count: 35,
    query:
      "UK and European banks, insurers, asset managers, payments companies, exchanges, lenders, and financial institutions appointing AI leaders or launching agentic AI, AI assistants, GenAI platforms, copilots, RAG, or AI governance programs.",
    criteria: [
      "Target account must be a UK or European financial-services operator.",
      "Signal can be an appointment, team formation, official launch, credible trade article, job post, or named customer story.",
      "Prefer fresh sources and named workflows in banking, insurance, wealth, payments, capital markets, lending, compliance, or fraud.",
    ],
  },
  {
    id: "apac_fsi_agentic_ai",
    lane: "official_ai_agent_launches",
    count: 35,
    query:
      "APAC banks, insurers, asset managers, payments companies, exchanges, lenders, and financial institutions launching or hiring for AI agents, AI assistants, agentic AI, GenAI copilots, RAG, or AI governance.",
    criteria: [
      "Target account must be an APAC financial-services operator.",
      "Signal can come from official announcements, credible trade/news coverage, job posts, regulator/public institution pages, or named customer stories.",
      "Prefer workflows in banking support, claims, lending, wealth, payments, capital markets, fraud, AML/KYC, or governance.",
    ],
  },
  {
    id: "public_financial_procurement_ai",
    lane: "procurement_rfp",
    count: 30,
    query:
      "Public banks, central banks, pension funds, financial regulators, development banks, public insurers, and financial authorities issuing tenders, RFPs, awards, or procurement notices for generative AI, AI agents, semantic search, RAG, knowledge management, or AI customer service.",
    criteria: [
      "Target account must be the buyer: public financial institution, regulator, pension fund, public insurer, central bank, development bank, or financial authority.",
      "Source must be procurement, tender, award, RFP, contract, or official public notice.",
      "Set account_name to the buyer, not the supplier or procurement publisher.",
    ],
  },
  {
    id: "named_customer_stories_fsi_agents",
    lane: "vendor_partner_announcements",
    count: 40,
    query:
      "Named financial-services customer stories where a bank, insurer, lender, asset manager, payments company, fintech operator, exchange, or broker is using AI agents, AI assistants, copilots, GenAI, RAG, semantic search, fraud AI, claims AI, or compliance AI.",
    criteria: [
      "Requires a named financial-services customer/operator as the account.",
      "Source may be a vendor case study, customer story, partner announcement, trade article, press release, or official account page.",
      "Reject the item if only the vendor or solution provider can be named.",
    ],
  },
  {
    id: "fsi_ai_governance_model_risk",
    lane: "governance_model_risk",
    count: 30,
    query:
      "Banks, insurers, asset managers, payments companies, fintech operators, exchanges, lenders, regulators, and public financial institutions discussing AI agent governance, model risk, audit trails, human-in-the-loop controls, responsible AI, GenAI policy, or AI compliance monitoring.",
    criteria: [
      "Target account must be the financial institution, regulator, public financial institution, or financial-services operator discussing or implementing governance.",
      "Signal must relate to AI agents, GenAI, model risk, auditability, policy enforcement, compliance, responsible AI, or monitoring.",
      "Reject generic consulting/vendor/cloud-provider governance content unless it names the financial-services account.",
    ],
  },
];

const websetId = getArg("--webset-id") ?? getOptionalEnv("EXA_WEBSET_ID");
if (!websetId) {
  throw new Error("Missing EXA_WEBSET_ID. Pass --webset-id or set it in .env.local.");
}

const only = new Set(
  (getArg("--only") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const limit = Number(getArg("--limit") ?? "");
const selected = searches
  .filter((search) => !only.size || only.has(search.id))
  .slice(0, Number.isFinite(limit) && limit > 0 ? limit : undefined);

const payloads = selected.map((search) => ({
  id: search.id,
  payload: {
    query: search.query,
    count: search.count,
    entity: {
      type: "custom",
      description: signalEntityDescription,
    },
    criteria: [...commonCriteria, ...search.criteria].map((description) => ({ description })),
    behavior: "append",
    metadata: {
      product: "fsi_signal_studio",
      expansion_version: "2026-06-05-precision",
      expansion_id: search.id,
      lane_id: search.lane,
    },
  },
}));

if (!hasFlag("--apply")) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        websetId,
        searches: payloads,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const client = new ExaWebsetsClient();
const created = [];
for (const { id, payload } of payloads) {
  const result = await client.createSearch(websetId, payload);
  created.push({ id, result });
}

console.log(JSON.stringify({ mode: "apply", websetId, created }, null, 2));
