# FSI Internal Agent Signal Exploration

Date: June 5, 2026

## ICP Thesis

The broad ICP is:

> Financial-services companies with public evidence that they are building, deploying, hiring for, governing, or seriously evaluating internal AI agents.

That is the behavioral trigger. The firmographic ICP underneath it is banks, insurers, asset/wealth managers, payments/fintech infrastructure, and FSI operations/data vendors.

The AE/SDR feed should not call this an intent score. It should be a newest-first source-backed signal feed with tags.

## What We Ran

Deepline/Exa/Crustdata exploration produced a candidate corpus:

- 60 Exa public-web query rows
- 25 Exa news query rows
- 15 Exa financial-report query rows
- 60 Crustdata LinkedIn keyword query rows
- 20 Crustdata LinkedIn job-content query rows
- 25 Crustdata named-account LinkedIn query rows

Flattened output:

- 1,224 candidate signal rows
- 55 high-reliability rows
- 854 medium-reliability rows
- 315 low/noisy rows

Key files:

- Raw candidate CSV omitted from the public repository.
- `deepline/data/fsi-agent-signal-exploration/exa_public_web_results.csv`
- `deepline/data/fsi-agent-signal-exploration/exa_news_results.csv`
- `deepline/data/fsi-agent-signal-exploration/exa_financial_report_results.csv`
- `deepline/data/fsi-agent-signal-exploration/crustdata_linkedin_results.csv`
- `deepline/data/fsi-agent-signal-exploration/crustdata_linkedin_jobs_results.csv`
- `deepline/data/fsi-agent-signal-exploration/crustdata_named_account_linkedin_results.csv`

Approximate spend: about $29 from an initial balance of about $48.05 to about $19.30.

## Strongest Signals Found

### Citi

Official source and trade press show Citi introducing Arc, an internal AI-agent platform to build and scale agents across the firm. The sources mention governance, auditability, risk framework, developer rollout, and wealth workflow examples.

Why it matters:
- Very strong account-level signal.
- Directly maps to Exa use cases around grounding, retrieval, monitoring, auditable source trails, and agent workflows.
- Best demo account candidate.

### Standard Chartered

Official Standard Chartered content discusses agentic AI in asset servicing, AI operators, autonomous execution, human-in-the-loop client-ready responses, and operational capacity.

Why it matters:
- Strong official account signal.
- Good for asset-servicing / capital-markets workflow demo.

### Duco

Duco launched an agentic operations platform for financial services with references to post-trade operations, reconciliation, exception management, audit trails, and MCP.

Why it matters:
- Strong FSI vendor/platform signal.
- Useful if the app wants to show how Exa can also target FSI infrastructure vendors serving banks/asset managers.

### FIS

FIS and Anthropic announced a Financial Crimes AI Agent for AML investigations. LinkedIn and news/trade sources mention financial-crimes workflows and regulated evidence/decisioning concerns.

Why it matters:
- Strong workflow signal: AML/KYC/investigations.
- Good monitor-demo template: financial-crimes evidence monitor.

### Morgan Stanley

Sources surfaced Morgan Stanley wealth-management AI-agent/super-agent discussion and related financial-advice workflow signals.

Why it matters:
- Strong wealth/advisor demo angle.
- Useful for a prospect-facing monitor around advisor prep, market events, client questions, and source-backed insights.

### Mastercard / Visa / Santander

Multiple sources mention agentic commerce, AI-agent payments, and authenticated agentic transactions.

Why it matters:
- Strong payments/agentic-commerce subsegment.
- Less internal-agent oriented than Citi, but still relevant for FSI agent adoption.

### Vanguard / UBS / HSBC / Deutsche Bank / Manulife

Exa found account-specific AI/adoption/governance signals. Some were very strong, some were more general AI transformation.

Why it matters:
- These accounts support breadth in the feed.
- They are probably secondary examples behind Citi, FIS, Standard Chartered, Duco, and Morgan Stanley.

## Source Reliability

Best v1 source hierarchy:

1. Official account pages, blogs, press releases
2. Credible trade press about named accounts
3. Vendor/customer stories about named FSI workflows
4. Public job posts and recruiter posts
5. LinkedIn posts from employees/practitioners
6. Broad LinkedIn keyword search and influencer commentary
7. Financial reports / filings for this specific signal

Financial reports were weaker than expected. They often returned formal SEC/annual-report text without clear agent-specific evidence.

## LinkedIn Finding

LinkedIn keyword search is useful but noisy.

The Crustdata LinkedIn post tool supports filters like:

- `AUTHOR_COMPANY`
- `AUTHOR_TITLE`
- `AUTHOR_INDUSTRY`
- `COMPANY`
- `MENTIONING_COMPANY`

But a quick test using `AUTHOR_COMPANY: [\"Citigroup\"]` did not constrain results to Citi employees. That suggests the filter likely needs canonical IDs or exact provider-specific values, or it may require a different pre-resolution step.

Practical product implication:

- Do not make broad LinkedIn keyword search the main signal source.
- Use LinkedIn as a secondary context lane.
- Best LinkedIn strategy:
  - Start with Exa/account-owned source to identify target account.
  - Use Crustdata named-account queries for surrounding social/practitioner context.
  - Post-filter by `person_details.current_employers`, `company_details`, author title, and named account mentions.
  - Tag results as `linkedin_practitioner_signal`, `linkedin_recruiter_signal`, `linkedin_company_post`, or `linkedin_noise`.

## Job Signal Finding

Job/recruiting signals exist and are very relevant, especially for:

- Agentic AI / ML engineer
- RAG / LangChain / LangGraph
- AI governance
- KYC/AML
- Banking domain
- Investment banking
- Insurance/underwriting/claims

But they are often recruiter posts for unnamed clients. The feed should show them as medium confidence unless the hiring company or end client is named.

Recommended tag:

- `job-post-signal`
- `recruiter-post`
- `unnamed-client`
- `agent-tech-keywords`

## Recommended Feed Tags

Signal type:
- `internal-agent-platform`
- `agentic-ops`
- `ai-governance`
- `aml-kyc`
- `wealth-advisor`
- `asset-servicing`
- `agentic-commerce`
- `job-post-signal`
- `vendor-partnership`
- `regulatory-pressure`

Source type:
- `official-source`
- `trade-press`
- `vendor-case-study`
- `job-post`
- `linkedin-company-post`
- `linkedin-practitioner-post`
- `linkedin-recruiter-post`
- `financial-report`

Evidence level:
- `account-owned`
- `named-account-trade-press`
- `named-account-social`
- `unnamed-fsi-client`
- `market-level`
- `low-confidence`

Workflow:
- `research-synthesis`
- `client-prep`
- `risk-governance`
- `aml-investigation`
- `vendor-risk`
- `post-trade-ops`
- `claims-underwriting`
- `advisor-workflow`
- `payments-commerce`

Tech:
- `rag`
- `retrieval`
- `grounding`
- `mcp`
- `langchain`
- `langgraph`
- `autogen`
- `vector-search`

## App Scope Implications

The strongest applet is:

> A newest-first AE/SDR signal feed for FSI accounts showing public evidence that an account is adopting internal AI agents, with tags, source provenance, and a one-click path to generate a prospect-specific monitor demo.

Recommended v1:

- No intent score.
- Sort by recency.
- Use tags and evidence-level labels.
- Start with Exa official/trade-source retrieval.
- Add Crustdata LinkedIn as a contextual enrichment lane, not the backbone.
- Let reps filter by segment, territory, source type, signal type, and evidence level.
- For each signal, show why Exa is relevant:
  - grounding
  - semantic search
  - source-backed retrieval
  - monitoring
  - public web intelligence
  - agent/tool context

## Best Demo Account

Use Citi as the golden path.

Why:
- Official account-owned source.
- Clear internal AI-agent platform.
- Strong governance/risk language.
- Clear wealth workflow example.
- Easy to map to Exa.
- Strong enough for the generated prospect monitor.

Possible demo flow:

1. AE opens feed filtered to banks.
2. New Citi signal appears: Arc internal AI-agent platform.
3. Tags: `official-source`, `internal-agent-platform`, `wealth-advisor`, `ai-governance`.
4. Rep opens source detail with Citi official page plus trade press.
5. App suggests prospect monitor options:
   - Wealth advisor source-grounding monitor
   - AI-agent governance/risk monitor
   - Market and competitor agent-adoption monitor
6. Rep generates branded preview link.

## Bottom Line

The ICP thesis is validated. There is enough public evidence to build the app around:

> FSI businesses showing public evidence of internal AI-agent adoption or serious AI-agent exploration.

But the winning data architecture is source-tiered:

- Exa for primary source-grounded account signals.
- Crustdata LinkedIn for secondary social/recruiter/practitioner context.
- Tags instead of scores.
- Newest-first feed instead of black-box intent.
