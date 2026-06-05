# Exa FSI Signal Studio

FSI Signal Studio uses Exa Websets to surface live AI-agent signals across financial services: launches, hiring, buying, build activity, and governance. From any signal, an AE or FDE can generate a prospect-specific demo Webset grounded in fresh, cited web intelligence.

Live demo:

```text
https://exasignalstudio.vercel.app
```

## Why This Exists

Exa wants to break into financial services. The wedge here is not a generic prospecting database; it is an AE/FDE enablement applet that turns public evidence of AI-agent adoption into a credible prospect demo.

The app helps a rep answer:

- Which FSI accounts are showing real AI-agent adoption signals?
- What source-backed evidence proves the signal?
- Which workflow is likely affected?
- What prospect-facing Exa Webset monitor would make the demo relevant?
- How can Exa ground that customer's actual agent workflow with fresh cited web intelligence?

## What The App Does

1. Uses Exa Websets to collect source-backed FSI AI-agent signals.
2. Groups signal records into account cards by company domain.
3. Lets reps filter by signal lane, confidence, source type, workflow, segment, territory, subsector, and review status.
4. Uses Exa Answer to review signals and generate account-level prospect Webset suggestions.
5. Lets a rep create a prospect-specific Signal Studio from the best suggested Webset concept.
6. Creates a live Exa Webset for the prospect page when live creation is authorized.
7. Embeds the prospect Webset results in the generated demo page, with preview/loading/live states.

## Current Production State

The deployed app is backed by Vercel Blob and production Exa environment variables.

Current production store:

- 192 signal records
- 104 accounts
- 104 cached account-level Exa Answer suggestions
- Daily Webset sync via Vercel Cron

The committed seed snapshot is intentionally lighter than production: it includes normalized signal, account, review, and studio records needed to inspect the app without credentials, while raw Webset payloads and research candidate dumps stay out of the public repository. Account-level suggestions can be regenerated with Exa Answer or shown through heuristic/row-review fallback.

The production cron route syncs new Webset results into the app and refreshes a bounded number of stale or missing account suggestions each day. Signals are synced first; Exa Answer review/suggestions run after sync rather than acting as a hard visibility gate.

## Quickstart With Seed Data

The repository includes a committed seed snapshot, so reviewers can run the app without creating an Exa Webset first.

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

This seed path is useful for reviewing the interface and data model. Live Webset refresh, Exa Answer backfills, and live prospect Webset creation require an Exa API key.

## Live Exa Setup

Create a local env file:

```bash
cp .env.example .env.local
```

Add your Exa API key:

```bash
EXA_API_KEY=your_exa_key_here
```

Then run:

```bash
npm run setup
```

`npm run setup` will:

- create the main Exa Webset if `EXA_WEBSET_ID` is missing
- create the initial signal searches and broad daily monitor
- write the created `EXA_WEBSET_ID` back to `.env.local`
- sync Webset items into the local store

To generate account-level prospect Webset suggestions with Exa Answer:

```bash
npm run backend:review-accounts-exa -- --limit 25
```

Local development can create live prospect Websets with `EXA_API_KEY`; if no passcode is configured locally, the live creation field can be left blank. Hosted deployments also require `STUDIO_ADMIN_SECRET`, which is a separate app passcode for the browser flow, not an Exa API key. Choose a private production value. Without it, the app still creates a preview Signal Studio without spending Exa capacity.

## Backend And Data Flow

Primary Webset:

- Entity type: custom signal entity
- One Webset item = one source-backed account signal
- The app groups signals into accounts by normalized company domain
- Multiple appended searches provide signal-lane coverage
- Monitors keep the Webset fresh

Daily deployed flow:

1. Exa Webset monitor runs on Exa's side.
2. `GET /api/cron/sync` pulls Webset items into the app store.
3. The app rebuilds accounts from signal records.
4. The same cron refreshes missing or stale account-level Exa Answer suggestions.
5. Create Studio uses the account suggestion to pick the prospect-facing monitor concept.
6. Authorized studio creation provisions a live prospect Webset and daily monitor.
7. Prospect pages fetch `/api/studios/{slug}/webset-items` and render preview/loading/live results.

## Useful Commands

```bash
npm test
npm run typecheck
npm run build

npm run setup                         # bootstrap Webset + local store
npm run setup -- --force-new-webset   # create a fresh Webset
npm run backend:sync                  # sync current Webset items
npm run backend:inspect               # inspect local store counts
npm run backend:review-signals-exa -- --limit 10
npm run backend:review-accounts-exa -- --limit 25
```

## API Surface

Reviewer-facing health and data:

- `GET /api/health`
- `GET /api/accounts`
- `GET /api/accounts/{domain}`
- `GET /api/signals`

Suggestion and studio generation:

- `GET /api/accounts/{domain}/suggestions`
- `POST /api/accounts/{domain}/suggestions`
- `POST /api/studios`
- `GET /api/studios/{slug}`
- `GET /api/studios/{slug}/webset-items?maxItems=30`

Ops routes:

- `POST /api/sync`
- `GET /api/cron/sync`
- `GET /api/cron/account-suggestions?limit=10`
- `GET /api/agent/manifest`

## Deployment

Set these environment variables in Vercel:

- `EXA_API_KEY`
- `EXA_WEBSET_ID`
- `CRON_SECRET`
- `SYNC_SECRET`
- `STUDIO_ADMIN_SECRET` (choose a private production passcode; do not use the local demo passcode)
- `ACCOUNT_SUGGESTION_SECRET` (optional; falls back to sync/cron/studio secret)
- `ACCOUNT_SUGGESTION_CRON_LIMIT=12`
- `APP_BASE_URL`

For deployed persistence, configure Vercel Blob:

- `BLOB_READ_WRITE_TOKEN`
- `DATA_STORE_BACKEND=blob`
- `BLOB_ACCESS=private`

The included `vercel.json` schedules `GET /api/cron/sync` daily.

## Supporting Docs

Start here if reviewing the product thinking behind the implementation:

- `docs/exa-take-home-assignment-context.md` - assignment context and chosen direction.
- `docs/fsi-signal-studio-spec-v3.md` - product/spec source of truth.
- `docs/backend-agent-ops.md` - backend/API/CLI contract.
- `docs/fsi-agent-signal-exploration-memo.md` - research notes on signal discovery.
- `docs/original-assignment/README.md` - redacted original assignment summary.

## Notes For Reviewers

This project intentionally keeps secrets out of the repository. A reviewer can run the seed app without credentials, or add an Exa API key to create/sync their own Webset. The deployed demo uses live Exa/Vercel configuration and is the best place to see the full workflow with cached Answer suggestions.
