# Exa FSI Take-Home Research Map

## Executive Takeaway

The research supports a two-layer strategy:

1. Direct enterprise ICP: large banks, asset managers, brokerages, wealth firms, insurers, payments companies, and lenders with AI/platform teams building internal agents.
2. Smaller-FSI reach: community banks, credit unions, RIAs, independent broker-dealers, and small lenders are real end users, but they are more likely reached through platform vendors, core banking systems, compliance tools, advisor tech, and packaged vertical applets.

For the take-home, the strongest applet remains sales-led: an AE/FDE tool that turns live external FSI signals into account-specific workflow demos. But the research should mention smaller FSI as a distribution/PLG expansion path, not ignore it.

## What FSI Teams Are Dealing With

- Regulated teams are not short on models; they are short on trusted, source-grounded external intelligence that agents can safely use.
- The pain is recurring and high-stakes: regulatory change, AML/KYC, fraud, credit/lending, investment research, advisor prep, claims, disputes, and vendor/AI governance.
- Internal docs are not enough. These workflows depend on regulators, filings, enforcement actions, adverse media, company pages, job postings, investor materials, transcripts, and niche trade/vendor sources.
- Adoption is uneven. Tier-1 firms are building internal agent platforms. Mid-market and smaller firms are adopting packaged AI through trusted vertical vendors.

## Market Structure

### Direct Buyers

- Tier-1 and upper-mid-market banks with AI platforms, model-risk teams, compliance owners, and internal agent roadmaps.
- Asset managers, brokerages, capital-markets teams, and wealth platforms using agents for research, advisor workflows, onboarding, and client-service support.
- Insurers and payments companies using AI for claims, fraud, disputes, agentic commerce, service, and underwriting.

### Platform Buyers

- Core/digital banking vendors: Fiserv, FIS, Jack Henry, Q2, Alkami, Temenos, Mambu.
- Lending/banking workflow vendors: nCino, MeridianLink, Blend-like origination systems.
- Wealth/advisor platforms: Envestnet, Orion, Morningstar, CRM/advisor workstations.
- Compliance/regtech platforms: Smartria, COMPLY, Hadrius, archive/supervision tools.

### Smaller-FSI End Users

- Community banks and credit unions are interested in AI, but the evidence suggests they mostly want low-risk packaged workflows: contact-center support, policy Q&A, employee assistants, lending/fraud, and governance.
- RIAs and independent broker-dealers are a promising PLG segment for compliance and advisor productivity, especially SEC Marketing Rule, Reg S-P, Form ADV, client-review prep, and meeting intelligence.
- The cleaner Exa business angle is not "sell raw Exa to every small firm"; it is "power vertical agents used by these firms through trusted platforms or lightweight PLG applets."

## Best Workflow Wedges

1. Regulatory Change Impact Triage
   - Monitors SEC, FINRA, OCC, FDIC, CFPB, OFAC, FinCEN, Federal Register, and state regulators.
   - Converts new external items into impacted policies, products, owners, deadlines, and audit evidence.

2. AML/KYC and Adverse Media Evidence Pack
   - Searches sanctions, PEP, enforcement, regulator, court, corporate registry, adverse media, and company-web evidence.
   - Useful because freshness and alias/source validation matter.

3. Advisor Meeting or Client Brief
   - Pulls market news, filings, fund/security changes, product docs, prior public context, and compliance notes.
   - Works for wealth platforms, RIAs, and broker-dealers.

4. Investment Memo / Analyst Research Starter
   - Retrieves filings, earnings transcripts, investor relations, news, peer signals, bull/bear evidence, and source quotes.
   - Crowded market, but Exa can win on public-web discovery and API integration into agents.

5. Credit / Lending External Risk Pack
   - Collects borrower, sector, macro, legal, and news signals; generates source-backed risk sections.
   - Needs explainability because credit decisions trigger adverse-action and fair-lending scrutiny.

6. Insurance Claims / Underwriting / External Data Governance
   - External data, AI models, underwriting, claims, and third-party data use are regulator-visible.
   - Good wedge if demo can stay public-source and avoid private claim data.

7. AI Vendor Due Diligence / Governance Scanner
   - Searches vendor claims, security docs, public AI policies, regulator guidance, and third-party-risk requirements.
   - Very useful for smaller FSI and compliance teams.

## Exa-Specific Signals

The strongest Exa signal layer is cross-source, semantic, and fresh:

- AI/LLM/agent job postings at FSI firms.
- Public AI-governance statements and model-risk language.
- SEC, FINRA, OCC, FDIC, CFPB, OFAC, FinCEN, NCUA, NAIC, and Federal Register updates.
- Enforcement actions, consent orders, settlements, and examination priorities.
- 10-K, 10-Q, 8-K, Pillar 3, call-report, and investor-presentation disclosures.
- Earnings-call transcripts and executive quotes about AI, risk, compliance, cost, and data ingestion.
- Vendor docs, product pages, API docs, app marketplaces, partner listings, and integration docs.
- Adverse media, niche trade press, corporate registries, sanctions/PEP context, and product/policy page changes.

The unique Exa claim should be:

> Exa helps FSI agents discover and cite fresh, non-obvious external sources across the messy public web, not just retrieve from static databases or internal documents.

## Competitors And Status Quo

FSI teams already have a stack:

- Bloomberg, FactSet, Refinitiv/LSEG, Aladdin, and other terminals/workstations.
- AlphaSense, Tegus, Sentieo-style research platforms, expert-call/transcript/filing tools.
- LexisNexis, Bloomberg Law, Thomson Reuters, Compliance.ai, and regulatory intelligence vendors.
- Google, Perplexity, Microsoft Copilot, Glean, internal search, and bespoke scraping.
- Platform-native copilots from Fiserv, FIS, nCino, Q2, Temenos, Envestnet, Orion, Morningstar, and others.

The positioning should not be "Exa replaces Bloomberg." A better claim:

> Exa is the programmable external-retrieval layer that lets FSI agents find fresh public evidence, long-tail sources, regulator updates, and workflow-specific citations that static or licensed tools may miss or may not expose through flexible APIs.

## Product Requirements To Showcase

- Source packs: regulators, filings, investor relations, trade press, vendor docs, sanctions/adverse media, state regulators.
- Source-quality labels: regulator, filing, first-party, trade press, vendor, academic, weak.
- Freshness: publish/update timestamps, recency badges, live crawl where possible, stale-source warnings.
- Claim-to-source traceability: each generated claim maps to a quoted source span.
- Audit/export: query, sources, timestamps, search params, citations, answer, reviewer decision.
- Monitoring: saved queries, regulator/filing alerts, webhooks, Slack/email summaries.
- Refusal behavior: if evidence is thin, the applet should say so and ask for a narrower source set.
- Human review: outputs are drafts/evidence packs, not regulated decisions or investment advice.

## Sales Barriers

- Model risk, hallucination, explainability, reliability, and output consistency.
- Data privacy, confidentiality, retention, DLP, permissions, and third-party-risk reviews.
- Recordkeeping, supervision, auditability, and communications compliance.
- Procurement cycles involving legal, compliance, information security, model risk, AI governance, and business workflow owners.
- Competitive skepticism because many vendors already claim "AI for finance."

How to overcome:

- Demo on the buyer's actual workflow with real external sources.
- Show source quality and citations in the product, not just the README.
- Include counterevidence and unsupported-claim handling.
- Offer a narrow pilot: regulatory monitoring, AML/KYC evidence packs, advisor briefing, or credit memo evidence.
- Give FDEs reproducible queries, source bundles, and demo prompts.

## Recommended Applet Direction

Build the SLG applet as:

> FSI Signal-to-Demo Router

End user: Exa AE/FDE.

Input:

- Target account or segment.
- Optional workflow focus: regulatory, AML/KYC, wealth/advisor, investment research, credit/lending, insurance, payments.

Output:

- Account signal map with source-quality labels.
- Evidence board of regulator, filing, first-party, trade, vendor, and weak sources.
- Likely agent workflow pains.
- Recommended Exa-powered demo angle.
- Buyer objections and compliance controls to address.
- Pilot suggestion and success metric.

Why this works:

- It is clearly internal enablement for Exa's sales-led FSI motion.
- It still demonstrates Exa as a force multiplier for financial-services teams because every sales output maps to a real FSI workflow.
- It can support smaller FSI by switching the target from a direct account to a platform/vendor or an end-user segment.

## Strong PLG Alternative

If choosing PLG instead, the strongest applet is:

> RIA Regulatory Impact Brief

End user: RIA CCO, advisor ops, broker-dealer compliance, or small wealth firm operator.

Input:

- Firm type, AUM band, jurisdictions, business model, and topic.

Output:

- New/relevant SEC, FINRA, state, and industry sources.
- Applicability summary.
- Deadline/action checklist.
- Source-backed review packet.
- Exportable compliance brief.

Why this works:

- It is narrow enough to demo.
- It attracts smaller-FSI users.
- It naturally converts to saved monitors, review queues, team workflows, and eventually Exa/API usage.

## Final Recommendation

Use the SLG route for this take-home, but make the research narrative broader:

- Enterprise FSI is the clearest direct customer.
- Smaller FSI is a real end-user market, mostly reached via platforms or focused PLG applets.
- The core Exa wedge is external intelligence for source-grounded agents.
- The applet should prove Exa can turn messy public web evidence into credible workflows: demos, briefs, monitors, and audit-ready source packs.

## Research Artifacts

- Raw subagent results: not copied into this repo.
- ICP validation note: docs/fsi-icp-validation.md
