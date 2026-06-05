import type { SignalLane } from "./domain";

export type SignalLaneConfig = {
  id: SignalLane;
  label: string;
  defaultSearch: string;
  criteria: string[];
  primary: boolean;
};

export const signalLanes: SignalLaneConfig[] = [
  {
    id: "customer_ai_assistants",
    label: "Customer AI Assistants",
    primary: true,
    defaultSearch:
      "Financial services companies launching AI assistants, AI chatbots, virtual assistants, AI claim assistants, AI mortgage assistants, AI wealth assistants, AI fraud assistants, or customer support AI agents.",
    criteria: [
      "Names the target account as a financial-services company: bank, credit union, insurer, lender, wealth or asset manager, payments company, exchange, broker, pension fund, or capital-markets firm.",
      "Describes a customer-facing or employee-facing AI assistant, chatbot, copilot, or agent.",
      "Names a workflow such as banking support, claims, mortgage, wealth, fraud, payments, account servicing, underwriting, or employee support.",
      "Contains explicit AI language, not generic chat/support language.",
      "Reject vendor, consulting, analyst, event, association, and generic technology pages unless the account field is the named financial-services buyer/operator rather than the publisher.",
    ],
  },
  {
    id: "official_ai_agent_launches",
    label: "Official AI Agent Launches",
    primary: true,
    defaultSearch:
      "Financial services companies announcing internal AI agents, agentic AI platforms, AI assistants, copilots, or autonomous workflow agents.",
    criteria: [
      "Names the target account as a financial-services company: bank, credit union, insurer, lender, wealth or asset manager, payments company, exchange, broker, pension fund, or capital-markets firm.",
      "Describes an AI agent, agentic AI system, copilot, AI assistant, or autonomous workflow.",
      "Comes from an official source, credible trade/news source, press release, or trusted vendor/customer story.",
      "Reject pages where the only named company is an AI vendor, consultancy, cloud provider, association, event organizer, or software implementation partner.",
    ],
  },
  {
    id: "ai_leadership_team",
    label: "AI Leadership / Team Formation",
    primary: true,
    defaultSearch:
      "Financial services companies hiring or appointing leaders for agentic AI, AI agents, generative AI platforms, AI governance, AI enablement, AI automation, or AI product strategy.",
    criteria: [
      "Names the hiring or appointing organization as a financial-services company: bank, credit union, insurer, lender, wealth or asset manager, payments company, exchange, broker, pension fund, or capital-markets firm.",
      "Mentions a role, appointment, team, job post, or leadership mandate related to AI agents or GenAI platforms.",
      "Prefers official pages, credible trade sources, event speaker profiles, and validated company context.",
      "Reject generic consulting, implementation partner, cloud provider, and vendor roles even when the job serves financial-services customers.",
    ],
  },
  {
    id: "job_posts_hiring",
    label: "Job Posts / Hiring Signals",
    primary: true,
    defaultSearch:
      "Financial services job postings for agentic AI, AI agents, LangChain, LangGraph, Mastra, AI SDK, RAG, vector search, generative AI platforms, AI governance, AML AI, KYC AI, claims AI, underwriting AI, fraud AI, or advisor AI.",
    criteria: [
      "Source is a job post, careers page, or hiring page.",
      "Company is named or strongly attributable.",
      "The hiring company is a financial-services company: bank, credit union, insurer, lender, wealth or asset manager, payments company, exchange, broker, pension fund, or capital-markets firm.",
      "Mentions agentic AI, AI agents, RAG, LangChain, LangGraph, Mastra, AI SDK, vector search, or AI workflow infrastructure.",
      "Reject vendor or consultancy hiring pages unless the company itself is a financial-services operator.",
    ],
  },
  {
    id: "vendor_partner_announcements",
    label: "Vendor / Partner Announcements",
    primary: true,
    defaultSearch:
      "Vendors announcing AI agents, agentic AI platforms, or AI workflow automation for named financial-services customers, where the target account is the named customer or operator.",
    criteria: [
      "Involves a named financial-services customer/operator, not just a generic FSI workflow.",
      "Mentions AI agents, agentic AI, AI assistant, copilot, or autonomous workflow automation.",
      "Source is a vendor announcement, customer story, case study, press release, or credible trade article.",
      "Set account_name and company_domain to the named financial-services customer/operator. Reject the item if only the vendor, consultancy, cloud provider, or implementation partner can be named.",
    ],
  },
  {
    id: "webinars_whitepapers",
    label: "Webinars / Whitepapers",
    primary: false,
    defaultSearch:
      "Financial services webinars, whitepapers, reports, or on-demand events about agentic AI, AI agents, autonomous banking, AI compliance, AI claims, AI underwriting, AI wealth management, AI financial crime, or AI customer support.",
    criteria: [
      "Source is a webinar, whitepaper, report, event page, or registration page.",
      "Content is about financial services.",
      "Content discusses agentic AI, AI agents, or AI-powered workflow automation.",
      "Requires a named financial-services company as the account, such as a bank, insurer, lender, asset manager, payments company, exchange, broker, or pension fund.",
      "Reject vendor-only thought leadership, event organizer pages, analyst reports, and association pages when no named financial-services operator is the account.",
    ],
  },
  {
    id: "conference_speaker",
    label: "Conference / Speaker Signals",
    primary: false,
    defaultSearch:
      "Financial services conference agendas and speaker abstracts mentioning agentic AI, AI agents, autonomous banking, AI in AML, AI in claims, AI in wealth management, AI in payments, or AI governance.",
    criteria: [
      "Source is a conference agenda, speaker page, panel description, or event recap.",
      "Content mentions financial services.",
      "Content mentions AI agents, agentic AI, or a specific AI workflow.",
      "The account must be a named financial-services speaker employer, buyer, operator, or customer example.",
      "Reject event organizers, associations, consultants, vendors, and cloud providers as account rows.",
    ],
  },
  {
    id: "governance_model_risk",
    label: "Governance / Model Risk",
    primary: false,
    defaultSearch:
      "Financial services companies discussing agentic AI governance, AI model risk, audit trails, human-in-the-loop controls, AI compliance monitoring, responsible AI agents, or AI risk frameworks.",
    criteria: [
      "Relates to financial services.",
      "Mentions AI governance, model risk, auditability, controls, human-in-the-loop, or compliance.",
      "Mentions AI agents, agentic AI, GenAI, or autonomous AI workflows.",
      "Requires a named financial-services company, regulator, exchange, insurer, lender, asset manager, payments company, broker, bank, credit union, or pension fund as the account.",
      "Reject consultant/vendor/cloud-provider content unless the account is the named financial-services buyer/operator.",
    ],
  },
  {
    id: "procurement_rfp",
    label: "Procurement / RFP",
    primary: false,
    defaultSearch:
      "Financial services RFPs, procurement notices, contract awards, or public tenders for generative AI, AI agents, semantic search, knowledge management, AI monitoring, RAG, or AI customer service.",
    criteria: [
      "Source is procurement, RFP, tender, award, or contract-related.",
      "Buyer is a bank, insurer, credit union, pension fund, regulator, public financial institution, exchange, broker, lender, payments company, or asset manager.",
      "Mentions AI, generative AI, agents, semantic search, RAG, knowledge automation, or AI customer service.",
      "Set account_name/company_domain to the buyer, not the awarded supplier, publisher, or procurement portal.",
    ],
  },
  {
    id: "partner_marketplace",
    label: "Partner Marketplace / Integration Listings",
    primary: false,
    defaultSearch:
      "Financial services companies appearing as named customers, buyers, or operators in cloud, AI, data, or partner marketplace pages for AI agents, GenAI, RAG, assistants, fraud AI, compliance AI, or customer service AI.",
    criteria: [
      "Names a financial-services customer/operator as the target account.",
      "Appears in a partner, marketplace, integration, customer story, or solution listing.",
      "Mentions AI agents, GenAI, AI assistants, RAG, semantic search, or AI workflow automation.",
      "Reject pages where the only named company is a vendor, marketplace partner, cloud provider, agency, or software implementation firm.",
    ],
  },
];

export function getLaneConfig(id: SignalLane): SignalLaneConfig | undefined {
  return signalLanes.find((lane) => lane.id === id);
}
