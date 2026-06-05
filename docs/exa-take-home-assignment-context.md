# Exa Take-Home Assignment Context

Date: June 5, 2026

## Original Assignment

Overview:

Financial services companies are rapidly trying to adopt AI, largely through internal AI agents. Many employ teams of engineers to implement AI tools like Exa. Exa is trying to break into this vertical and wants a demonstration of how Exa can be a force multiplier for financial services.

The assignment asks the candidate to think through:

- What challenges teams in financial services face today.
- What needs their products might have, and what additions they might want.
- What signals or data Exa could uniquely capture that others cannot, and what market Exa could capture because of that.
- What barriers to expect in the sales process and how to overcome them.

What to build:

- A small applet that helps unlock this use case within the FSI vertical.
- The applet can be external or internal enablement for AEs/FDEs.

Applet requirements:

- Use Exa's API to retrieve, search, or analyze real external content relevant to financial-services agents.
- Make clear who the end user is and what problem they are solving.
- Show how Exa's capabilities fit into that user's actual workflow.

Deliverables:

- Working deployed URL.
- Demo video under 60 seconds.
- GitHub repository link or zip of source code.

Source attachment:

- `docs/original-assignment/README.md` summarizes the original prompt without publishing private application-system links or copied attachment content.

## Chosen Direction

Build an internal enablement applet for Exa AEs/SDRs, not a generic PLG tool.

End user:

- AE / SDR selling Exa into financial services.

Primary workflow:

- Find financial-services accounts showing source-backed evidence that they are building, deploying, hiring for, buying, or governing AI agents.
- Show the source-backed signal, account context, why Exa matters, and suggested prospect-facing monitor/demo ideas.
- Let the rep generate a branded prospect-specific demo Webset/app preview.

Why this still demonstrates Exa as a force multiplier for financial services:

- The applet finds accounts because their actual FSI workflows are adopting agents.
- It does not merely help sales reps; it turns public FSI agent-adoption evidence into a targeted demonstration of how Exa grounds, monitors, and enriches AI-agent workflows.

## Scope of Financial Services

Interpret financial services broadly, not just banks.

Include:

- Banks and credit unions.
- Insurers.
- Asset managers, wealth managers, RIAs, brokerages.
- Payments companies.
- Lending, mortgage, credit, and BNPL companies.
- KYC, AML, fraud, risk, compliance, and regtech vendors.
- Core banking, fintech infrastructure, capital-markets ops, reconciliation, and data vendors serving FSI.

Boundary:

- Do not include generic SaaS merely because it has financial-services customers.
- Include companies that either are FSI companies or sell core FSI workflow products.

## ICP Wording

The broad statement 'FSI businesses interested in or using AI agents internally' is better described as a wedge or qualification trigger, not the full ICP.

Recommended wording:

- ICP: regulated FSI organizations and FSI infrastructure companies building agentic workflows in knowledge work, compliance, risk, research, advisory, operations, customer support, claims, lending, payments, or financial-crime workflows.
- Trigger: public evidence that the account is building, deploying, hiring for, buying, or governing AI agents.

## Key Product Decisions

- Primary user: AE / SDR.
- FDE is secondary; FDEs do not usually prospect.
- No CRM integration in v1.
- No auth in v1.
- No intent score in v1.
- Feed is newest-first.
- Use source type, signal type, confidence, workflow, territory, account segment, and FSI subsector filters.
- Account-level UI with grouped/deduped signals.
- Webset entity should be signal-level custom entity, not company, because each account can have multiple signal types.
- App groups signal records by company/domain into account cards.

## Naming Decisions

Use:

- account_segment: GTM segment such as Strategic, Enterprise, Mid-Market, SMB.
- territory: sales or geographic territory such as US, UK, EMEA, APAC.
- fsi_subsector: bank, insurer, wealth, payments, lending, mortgage, AML/KYC, fraud, risk, regtech, core banking, capital-markets ops.

Avoid:

- territory_hint, because it sounds tentative and pipeline-ish.
- fsi_segment, because it is ambiguous with account segment.

## Research Summary

Prior Deepline/Exa/Crustdata exploration generated:

- 1,224 initial candidate signal rows.
- 169 heuristic named org candidates, but not all true positives.
- Estimated 25-35 rep-actionable accounts and about 15-20 strict true positives from the first corpus.
- Additional signal test across lanes 2-5 and 10 produced 477 filtered candidate rows.

Useful source files:

- data/research/fsi-agent-signal-candidates.csv
- docs/fsi-agent-signal-exploration-memo.md
- data/research/fsi-signal-2-5-10-test-candidates.csv
- docs/fsi-signal-2-5-10-test-memo.md

## Exa Docs Notes

Important Websets model:

- Websets create structured collections of items.
- Criteria are match rules; a result must satisfy all criteria in a given search.
- Enrichments extract fields after matching.
- A Webset can have multiple searches.
- Additional searches can append to the same Webset.
- Webset monitors can schedule search behavior to keep a Webset fresh.

Important design implication:

- Do not make one giant all-encompassing query.
- Do create multiple signal-specific searches into one Webset.
- Because the app needs to preserve multiple signals per account, use a signal-level custom entity and group by account in the app.

Docs referenced:

- https://exa.ai/docs/websets/api/how-it-works
- https://exa.ai/docs/websets/api/websets/searches/create-a-search
- https://exa.ai/docs/websets/api/monitors/create-a-monitor
- https://exa.ai/docs/websets/dashboard/criteria-versus-enrichments
