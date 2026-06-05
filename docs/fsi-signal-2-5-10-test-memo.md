# FSI Signal Test: Lanes 2-5 and 10

Date: June 5, 2026

## What We Tested

We ran a bounded public-web and LinkedIn-context pass for:

2. AI governance / model risk pages
3. Conference agendas and speaker abstracts
4. Webinars / whitepapers / registration pages
5. New AI leadership / team-formation signals
10. Customer support / help-center AI assistant signals

Artifacts:

- deepline/data/fsi-signal-refresh-test/exa_signal_2_5_10_queries.csv
- deepline/data/fsi-signal-refresh-test/exa_signal_2_5_10_results.csv
- deepline/data/fsi-signal-refresh-test/crustdata_signal_5_10_queries.csv
- deepline/data/fsi-signal-refresh-test/crustdata_signal_5_10_results.csv
- Raw candidate CSV omitted from the public repository; this memo preserves the useful counts and examples.

Flattened candidate rows after basic FSI + AI filtering:

- 477 total
- 133 AI leadership / team formation
- 104 help-center / customer AI
- 80 governance / model risk
- 80 conference agenda
- 80 webinar / whitepaper

## What Worked

### 10. Help-center / customer AI

This was the strongest account-level signal among the new lanes.

Examples surfaced:

- Capital One Chat
- BMO Assist chatbot
- Citi Sky for Citi Wealth
- Bank of America Erica
- Newrez Rezi Mortgage Assistant
- Better.com Betsy / Tinman in ChatGPT
- UWM Mia mortgage assistant
- Travelers AI Claim Assistant
- Allianz Project Nemo claims AI
- Starling AI scam advisor
- Lafayette Federal Credit Union Lia

Why it works:

- It is concrete proof that the company has shipped AI into a real workflow.
- It creates an obvious Exa angle: grounding, source retrieval, policy/content freshness, support accuracy, adverse event monitoring, compliance evidence, and explainability.
- It catches smaller/non-obvious FSI accounts, especially mortgage, insurance, credit union, and wealth/customer-service products.

Caveat:

- It can be a lagging launch signal, but it is still very useful because these systems need ongoing source-grounded improvement and monitoring.

### 5. AI leadership / team formation

This worked well for early/non-obvious account triggers.

Examples surfaced:

- Lloyds Banking Group appointing a Head of Agentic AI
- U.S. Bank Chief AI Officer profile
- RBC Capital Markets Head of AI and Digital Innovation profile
- Manulife Head of Generative AI / front office analytics
- State Street Global Head of Data and AI Governance and Oversight
- Axos AI Enablement and Governance Lead role
- Danske Bank GenAI Lifecycle Lead role
- Capital One Agentic AI / GenAI platform engineering roles
- AEA Investors Head of AI Solutions
- Cambridge Associates AI leadership/profile signal

Why it works:

- More leading than a press release.
- Stronger than generic LinkedIn sentiment because titles and job descriptions reveal organizational investment.
- Good source for rep territory filtering: new owner, new team, new platform mandate.

Caveat:

- Needs careful dedupe and source classification. Event speaker pages and job-board mirrors can inflate counts.

### 4. Webinars / whitepapers

This worked better than expected, mostly as a market/use-case and account-context lane.

Examples surfaced:

- Finastra: autonomous bank / agentic AI webinar
- ACTICO + Accenture: banking use cases and credit-risk demo
- BAFT: agentic AI use cases in transaction banking
- SymphonyAI: always-on compliance / financial crime compliance
- American Banker: agentic AI inside the bank
- Financial Brand: banking AI agent playbook
- InsurTech NY / Claims Journal / NAMIC: agentic AI in claims and insurance operations
- PIMFA / Oasis / Subatomic: RIA and wealth-management agent workflows

Why it works:

- Often earlier than polished customer stories.
- Great for tags and use-case clustering: AML, claims, transaction banking, RIA operations, compliance, customer support.
- Useful for prospect-facing demo generation even when the account is a vendor or trade body.

Caveat:

- Vendor-led pages do not always identify the end customer. Treat as medium-confidence unless a named FSI account appears.

### 3. Conference agendas / speaker abstracts

This worked as an early market-intelligence lane, less as a pure account trigger.

Examples surfaced:

- ANZ Sibos content on APIs and agentic AI
- Duco Sibos/session content on agentic operations
- Money20/20 coverage mentioning TD Bank, Stripe, Fiserv, NVIDIA
- ACAMS/SymphonyAI panel on AI agents in financial crime compliance
- Finovate AI-in-action and agentic payments coverage
- Insurtech Insights AI/claims/underwriting programming
- Prudential multi-agent platform with MCP/A2A via re:Invent summary source

Why it works:

- Catches projects before formal launch.
- Helps identify active speakers/buyers/builders.
- Good for SDR messaging because it gives a timely reason to reach out.

Caveat:

- Many results are event recaps and vendor summaries. Needs source-quality tagging.

### 2. Governance / model risk

This worked, but more as an enablement/context signal than standalone prospect discovery.

Examples surfaced:

- Citi agentic AI and risk decision-making
- Deloitte agentic AI risk in banking
- AWS financial-services approach to agentic AI controls
- Bank of England / Treasury AI risk and governance content
- Sardine audit-readiness playbook
- NAIC / insurance governance gap content
- AIG / Travelers / carrier model-risk articles

Why it works:

- Very aligned with Exa's value prop: source trails, grounding, retrieval, evaluation, monitoring, auditability.
- Good for generating the why Exa now explanation for each account signal.

Caveat:

- It often returns regulator/consultant/vendor content rather than a named prospect. Keep it as context/enrichment unless the account is directly named.

## Recommendation

Keep these lanes in this order:

1. Help-center / customer AI assistant
2. AI leadership / team formation
3. Webinars / whitepapers
4. Conference agendas / speaker abstracts
5. Governance / model risk

Use governance as a context layer, not the lead trigger.

## Websets / Monitor Shape

Do not make one giant query string.

Better architecture:

- One master Webset: FSI AI Agent Signals
- Multiple searches or monitors inside that Webset, one per signal lane
- Each search carries lane-specific query, criteria, and metadata
- Items are enriched into the applet's feed shape:
  - account
  - signal lane
  - signal type
  - evidence quote/summary
  - source URL
  - source quality
  - confidence
  - why Exa is relevant
  - suggested prospect-facing monitor/demo options

Why:

- Websets are good for structured, verified, enriched collections.
- Webset monitors keep that collection fresh by scheduled search or refresh behavior.
- One master Webset keeps the AE/SDR feed unified.
- Multiple lane-specific monitors preserve precision, tags, and explainability.

Standalone Exa Monitors are better if the app only needs webhook-delivered search results and not a persistent verified Webset collection.
