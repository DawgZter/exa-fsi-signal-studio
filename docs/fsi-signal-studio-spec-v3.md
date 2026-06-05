# Exa FSI Signal Studio Spec v3

Date: June 5, 2026

Status: canonical source of truth for the next implementation session.

Supersedes:

- Earlier v1/v2 account-level Webset drafts from the prior research workspace.

Key correction from v2:

- Do not use a company entity Webset as the primary source of truth.
- Use a signal-level Webset entity so one account can preserve multiple signal types.
- Group and dedupe signals into account cards in the app layer.

## One-Sentence Pitch

An internal AE/SDR applet that uses Exa Websets to find source-backed FSI AI-agent adoption signals, groups them into account-level cards, and lets reps generate a branded prospect-facing Signal Studio for that account.

## End User

Primary:

- AE / SDR selling Exa into financial services.

Secondary:

- FDE, if they want to use the generated prospect-specific Signal Studio during technical discovery.

## Problem

Exa wants to break into financial services. Reps need a way to find non-obvious FSI accounts where AI-agent adoption is real, understand the workflow context, and demonstrate why Exa matters without waiting for a long discovery cycle.

The applet should help reps answer:

- Which FSI accounts are showing signs of AI-agent adoption?
- What source-backed evidence proves it?
- Which workflow is affected?
- Why is Exa relevant to this account now?
- What prospect-facing monitor/demo should we show them?

## Core Workflow

1. Rep opens a newest-first feed of account cards.
2. Each account card shows one or more source-backed signals.
3. Rep filters by territory, account segment, FSI subsector, signal type, workflow, source type, confidence, and date.
4. Rep clicks an account card.
5. Rep reviews the signal timeline, source evidence, and why Exa matters.
6. Rep clicks Create Branded Signal Studio.
7. App generates three account-specific Signal Studio options.
8. Rep selects one, optionally edits the brief, and creates a branded prospect-facing link.
9. Rep uses that link in outbound, follow-up, or discovery.

## Branded Signal Studio

This is the second half of the applet and should be visible in the demo.

Definition:

- A prospect-facing mini app/monitor generated from a specific account and signal context.
- It is branded to the prospect account and tailored to one of their likely AI-agent workflows.
- It demonstrates how Exa can ground, monitor, and enrich that workflow with real external web content.

Inputs:

- account_name
- company_domain
- fsi_subsector
- selected signal(s)
- evidence summary
- source URLs
- workflow
- why Exa matters
- optional rep-written note

Generated options:

- Customer AI grounding monitor.
- AI governance / auditability monitor.
- Competitive agent-adoption monitor.
- Workflow-specific monitor such as AML, claims, mortgage, wealth/advisor, payments, or post-trade.

Example for Newrez:

- Source signal: Rezi Mortgage Assistant in ChatGPT.
- Suggested studio: Mortgage Guidance Grounding Monitor.
- What it tracks: mortgage rules, underwriting updates, housing policy changes, competitor AI mortgage tools, and borrower-risk/adverse-media context.
- Exa value: keeps the assistant grounded in current external content with source provenance.

Example for Travelers:

- Source signal: AI Claim Assistant.
- Suggested studio: Claims Evidence and Regulatory Monitor.
- What it tracks: claims regulation, disaster events, litigation trends, repair-cost signals, and competitor claims automation.
- Exa value: fresh external retrieval and traceable evidence for claims-agent workflows.

Example for FIS:

- Source signal: Financial Crimes AI Agent.
- Suggested studio: AML/KYC Adverse Media and Regulatory Monitor.
- What it tracks: sanctions, fraud typologies, enforcement actions, adverse media, and regulatory changes.
- Exa value: source-grounded external intelligence for financial-crime investigations.

## Webset Model

Use one Webset as the signal universe.

Webset name:

- FSI AI Agent Signals

Entity:

- custom

Entity description:

A source-backed public signal that a financial-services or FSI-infrastructure company is adopting, building, buying, hiring for, launching, or governing AI agents, AI assistants, copilots, agentic workflows, or source-grounded AI systems.

Why custom signal entity:

- The same account can match many signal types.
- The app needs to show multiple signal badges and a signal timeline per account.
- A company-level Webset risks collapsing multiple signals into one latest_signal_type.
- The app can still show account-level cards by grouping signal items by company_domain.

Search model:

- Create multiple appended searches into the same Webset.
- Each search corresponds to one signal type.
- Within a search, criteria are AND rules.
- Across searches, append behavior gives OR-like coverage across signal types.

Monitor model:

- Create one scheduled Webset monitor per signal type.
- Each monitor reruns its lane-specific search and appends fresh signal items.
- Daily or weekly cadence is enough for v1.

Deduplication model:

- Webset dedupe should avoid exact duplicate signal items where possible.
- App-level signal dedupe key: normalized_account_domain + signal_type + canonical_source_url.
- App-level account grouping key: normalized_account_domain first, normalized account name fallback.
- UI shows one card per account, with all signal types and latest signal date.

## App Data Model

accounts:

- account_id
- account_name
- company_domain
- account_segment
- territory
- fsi_subsector
- latest_signal_date
- latest_signal_id
- all_signal_types_seen
- signal_count
- highest_confidence
- last_seen_at

signals:

- signal_id
- webset_item_id
- account_id
- account_name
- company_domain
- signal_type
- source_url
- source_title
- source_domain
- source_type
- source_date
- discovered_at
- evidence_summary
- evidence_snippet
- confidence
- confidence_reason
- workflow
- agent_adoption_stage
- why_exa_matters
- suggested_demo_options
- search_id
- monitor_id

branded_signal_studios:

- studio_id
- account_id
- selected_signal_ids
- studio_name
- selected_workflow
- generated_brief
- monitor_query
- monitor_criteria
- branded_url_slug
- created_at
- created_by_rep

## Naming

Use:

- account_segment: Strategic, Enterprise, Mid-Market, SMB.
- territory: US, UK, EMEA, APAC, etc.
- fsi_subsector: Banking, Credit Union, Insurance, Wealth/RIA, Asset Management, Payments, Lending/Mortgage, AML/KYC, Fraud/Risk, Regtech, Core Banking, Capital Markets Ops.

Avoid:

- territory_hint.
- fsi_segment.

## Core Enrichments

Each Webset signal item should extract:

- account_name
- company_domain
- account_segment, if inferable
- territory, if inferable
- fsi_subsector
- signal_type
- source_url
- source_title
- source_domain
- source_type
- source_date
- evidence_summary
- evidence_snippet
- workflow
- agent_adoption_stage
- confidence
- confidence_reason
- why_exa_matters
- suggested_demo_options
- outreach_angle

Confidence rules:

- High: official company source, named-account trade/news source, direct company job post, or named customer story.
- Medium: credible trade source, vendor announcement naming an account, webinar/conference with named account, validated LinkedIn/company context.
- Low: generic vendor blog, recruiter post for unnamed client, broad LinkedIn/influencer post, market-level article with no named account.

## Signal Searches

### 1. Official AI Agent Launches

Search:

Financial services companies announcing internal AI agents, agentic AI platforms, AI assistants, copilots, or autonomous workflow agents for banking, insurance, wealth, payments, lending, compliance, AML, KYC, fraud, claims, underwriting, or capital markets operations.

Criteria:

- Source names a financial-services or FSI-infrastructure company.
- Source describes an AI agent, agentic AI system, copilot, AI assistant, or autonomous workflow.
- Source is official, credible trade/news, press release, or trusted vendor/customer story.

Examples:

- Citi Arc.
- Standard Chartered agentic AI in asset servicing.
- FIS Financial Crimes AI Agent.
- Duco agentic operations platform.
- Fiserv agentOS.

### 2. Customer AI Assistants

Search:

Financial services companies launching AI assistants, AI chatbots, virtual assistants, AI claim assistants, AI mortgage assistants, AI wealth assistants, AI fraud assistants, or customer support AI agents.

Criteria:

- Source names an FSI or FSI-infrastructure company.
- Source describes a customer-facing or employee-facing AI assistant, chatbot, copilot, or agent.
- Workflow is specific: banking support, claims, mortgage, wealth, fraud, payments, account servicing, underwriting, or employee support.
- Result contains explicit AI language, not just generic chat/support.

Examples:

- Capital One Chat.
- BMO Assist.
- Citi Sky.
- Bank of America Erica.
- Newrez Rezi Mortgage Assistant.
- Better.com Betsy / Tinman in ChatGPT.
- UWM Mia.
- Travelers AI Claim Assistant.
- Allianz Project Nemo.
- Starling AI scam advisor.
- Lafayette Federal Credit Union Lia.

### 3. AI Leadership / Team Formation

Search:

Financial services companies hiring or appointing leaders for agentic AI, AI agents, generative AI platforms, AI governance, AI enablement, AI automation, or AI product strategy.

Criteria:

- Source names an FSI or FSI-infrastructure company.
- Source mentions a role, appointment, team, job post, or leadership mandate related to AI agents, agentic AI, GenAI platforms, AI governance, or AI automation.
- Prefer official pages, credible trade sources, event speaker profiles, and validated LinkedIn context.

Examples:

- Lloyds Banking Group Head of Agentic AI.
- U.S. Bank Chief AI Officer.
- RBC Capital Markets Head of AI and Digital Innovation.
- Manulife Head of Generative AI / front office analytics.
- State Street AI governance leadership.
- Axos AI Enablement and Governance Lead.
- Danske Bank GenAI Lifecycle Lead.
- Capital One agentic AI platform roles.

### 4. Job Posts / Hiring Signals

Search:

Financial services job postings for agentic AI, AI agents, LangChain, LangGraph, Mastra, AI SDK, RAG, vector search, generative AI platforms, AI governance, AML AI, KYC AI, claims AI, underwriting AI, fraud AI, or advisor AI.

Criteria:

- Source is a job post, careers page, or hiring page.
- Company is named or strongly attributable.
- Company is FSI or FSI infrastructure.
- Post mentions agentic AI, AI agents, RAG, LangChain, LangGraph, Mastra, AI SDK, vector search, or AI workflow infrastructure.
- Exclude MCP from v1 job keywords because it creates too much generic tooling noise.
- Recruiter posts for unnamed clients are low or medium confidence.

Examples:

- Capital One GenAI / Agentic AI platform roles.
- Danske Bank GenAI Lifecycle Lead.
- Axos AI Enablement and Governance Lead.
- FE CREDIT / Quince-style credit automation hiring, if validated.

### 5. Webinars / Whitepapers

Search:

Financial services webinars, whitepapers, reports, or on-demand events about agentic AI, AI agents, autonomous banking, AI compliance, AI claims, AI underwriting, AI wealth management, AI financial crime, or AI customer support.

Criteria:

- Source is a webinar, whitepaper, report, event page, or registration page.
- Content is about financial services.
- Content discusses agentic AI, AI agents, or AI-powered workflow automation.
- If no named account appears, use as workflow/context enrichment rather than a high-confidence account signal.

Examples:

- Finastra autonomous banking webinar.
- ACTICO + Accenture banking/credit-risk demo.
- BAFT transaction banking use cases.
- SymphonyAI always-on compliance.
- American Banker agentic AI inside the bank.
- Financial Brand banking AI agent playbook.
- InsurTech NY / Claims Journal / NAMIC insurance agent workflows.
- PIMFA / Oasis / Subatomic RIA workflows.

### 6. Conference / Speaker Signals

Search:

Financial services conference agendas and speaker abstracts mentioning agentic AI, AI agents, autonomous banking, AI in AML, AI in claims, AI in wealth management, AI in payments, or AI governance.

Criteria:

- Source is a conference agenda, speaker page, panel description, or event recap.
- Content mentions financial services.
- Content mentions AI agents, agentic AI, or a specific AI workflow.
- Prefer named FSI companies, speaker employers, or customer examples.

Examples:

- ANZ Sibos APIs and agentic AI.
- Duco Sibos/session content.
- Money20/20 coverage mentioning TD Bank, Stripe, Fiserv, NVIDIA.
- ACAMS/SymphonyAI AI agents in financial-crime compliance.
- Finovate agentic payments/AI coverage.
- Insurtech Insights claims/underwriting programming.

### 7. Governance / Model Risk

Search:

Financial services companies discussing agentic AI governance, AI model risk, audit trails, human-in-the-loop controls, AI compliance monitoring, responsible AI agents, or AI risk frameworks.

Criteria:

- Source relates to financial services.
- Source mentions AI governance, model risk, auditability, controls, human-in-the-loop, or compliance.
- Source mentions AI agents, agentic AI, GenAI, or autonomous AI workflows.
- Regulator/consultant/vendor content without a named account should be enablement context, not a direct account trigger.

Examples:

- Citi agentic AI and risk decision-making.
- Deloitte agentic AI risk in banking.
- AWS financial-services agentic AI controls.
- Bank of England / Treasury AI risk content.
- Sardine audit-readiness playbook.
- NAIC insurance governance gap.
- AIG / Travelers model-risk content.

### 8. Vendor / Partner Announcements

Search:

Vendors announcing AI agents, agentic AI platforms, or AI workflow automation for named financial-services customers or FSI workflows such as AML, KYC, fraud, claims, underwriting, reconciliation, payments, wealth, or banking operations.

Criteria:

- Result involves a named FSI company or clearly FSI-specific workflow.
- Result mentions AI agents, agentic AI, AI assistant, copilot, or autonomous workflow automation.
- Source is vendor announcement, customer story, case study, press release, or credible trade article.
- If end customer is unnamed, tag as vendor workflow signal and medium confidence.

Examples:

- FIS + Anthropic Financial Crimes AI Agent.
- Fiserv + OpenAI/AWS co-created AI agents with banks.
- Talkdesk AI Agents for Financial Services.
- DataVisor conversational AI agents for financial crime.
- SymphonyAI financial-crime compliance agents.

### 9. Procurement / RFP

Search:

Financial services RFPs, procurement notices, contract awards, or public tenders for generative AI, AI agents, semantic search, knowledge management, AI monitoring, RAG, or AI customer service.

Criteria:

- Source is procurement, RFP, tender, award, or contract-related.
- Buyer is FSI, insurer, credit union, pension fund, regulator, public financial institution, or FSI infrastructure organization.
- Source mentions AI, generative AI, agents, semantic search, RAG, knowledge automation, or AI customer service.

Examples:

- Public pension AI knowledge-management RFP.
- Credit union AI customer-service procurement.
- Public financial authority GenAI/semantic-search tender.

### 10. Partner Marketplace / Integration Listings

Search:

Financial services companies or FSI vendors appearing in AWS, Microsoft, Google Cloud, Snowflake, Databricks, Salesforce, OpenAI, Anthropic, or partner marketplace pages for AI agents, GenAI, RAG, assistants, fraud AI, compliance AI, or customer service AI.

Criteria:

- Source names an FSI company or FSI-focused vendor.
- Source appears in a partner, marketplace, integration, customer story, or solution listing.
- Source mentions AI agents, GenAI, AI assistants, RAG, semantic search, or AI workflow automation.

Examples:

- Citi Sky with Google Cloud / DeepMind.
- Anthropic financial-services materials.
- AWS financial-services agentic AI stories.
- Snowflake insurance claims AI blueprint.
- Salesforce banking AI assistant/customer service examples.

## Recommended V1 Signal Set

Build first:

1. Customer AI Assistants.
2. Official AI Agent Launches.
3. AI Leadership / Team Formation.
4. Job Posts / Hiring Signals.
5. Vendor / Partner Announcements.
6. Webinars / Whitepapers.

Use as context/enrichment:

- Governance / Model Risk.
- Conference / Speaker Signals.
- Partner Marketplace / Integration Listings.

Optional v2:

- Procurement / RFP.

Skip v1:

- Subprocessor pages.
- Broad LinkedIn sentiment.
- SEC/annual reports.
- Raw docs/changelogs.
- Regulatory sandbox participation.

## App UI

Main feed:

- One card per account.
- Cards grouped by company_domain from signal-level Webset items.
- Latest signal date controls newest-first sorting.
- Show all signal badges for that account.

Account card fields:

- Account name.
- FSI subsector.
- Account segment.
- Territory.
- Latest signal date.
- Latest signal type badge.
- All signal badges.
- Source type badge.
- Confidence badge.
- Evidence summary.
- Source URL.
- Why Exa matters.
- Suggested demo options.

Filters:

- Territory.
- Account segment.
- FSI subsector.
- Signal type.
- Workflow.
- Source type.
- Confidence.
- Date range.

Account detail:

- Signal timeline.
- Source evidence per signal.
- Why Exa matters per workflow.
- Suggested buyers/personas.
- Button: Create Branded Signal Studio.

## Demo Flow Under 60 Seconds

1. Open FSI AI Agent Signals feed.
2. Filter to high/medium confidence and recent signals.
3. Click a non-obvious account like Newrez, Travelers, BMO, Capital One, Lloyds, or FIS.
4. Show multiple signal badges and source evidence.
5. Click Create Branded Signal Studio.
6. App generates three monitor/demo concepts.
7. Select one and show the branded prospect-facing preview.

## Sales Barriers

Likely barriers:

- Compliance and security review.
- Existing internal search/RAG/vendor stack.
- Skepticism that public web signals imply real need.
- Hallucination, auditability, source provenance, and data freshness concerns.
- Long enterprise cycles and unclear ownership across AI platform, data, risk, innovation, and business units.

How the applet helps overcome them:

- Starts with public-web-only evidence and demo; no private data required.
- Shows citations, provenance, and freshness from the first touch.
- Ties Exa to a specific workflow rather than generic AI hype.
- Routes outreach to the right buyer based on workflow.
- Gives the prospect a branded monitor they can inspect before a deep technical evaluation.

## Assignment Alignment Checklist

Use Exa API:

- Websets search external web content.
- Criteria verify relevance.
- Enrichments extract source-backed account/signal fields.
- Monitors keep the signal universe fresh.

Clear end user/problem:

- AE/SDR needs to find and activate FSI accounts adopting AI agents.

Workflow fit:

- Feed -> account detail -> branded Signal Studio -> prospect-facing demo link.

Creative vertical expansion:

- Uses public FSI agent-adoption signals to identify market demand and turn each demand signal into a live Exa-powered demo.

Market capture:

- Regulated FSI organizations and FSI infrastructure companies building agentic workflows in customer support, compliance, risk, claims, lending, mortgage, AML/KYC, wealth/advisor, payments, post-trade, and internal research.
