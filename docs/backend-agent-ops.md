# Backend And Ops Notes

This repo is a complete Next.js app with a one-page internal workspace, generated prospect-facing Signal Studio pages, and backend routes/CLI scripts for Exa Websets sync, Exa Answer suggestion generation, and deployment operations.

## System Model

- Exa Websets are the source of truth for live signal discovery.
- The Webset is created and seeded outside the app, then its monitors run daily.
- The app syncs current Webset items into a normalized backend store.
- The one-page internal app reads account/signal data from the backend.
- The AE creates a prospect demo page from any account/signal.
- Generated Signal Studio records are persisted by the backend and read by the prospect route.

## Secrets

Do not commit secrets.

Use environment variables:

- EXA_API_KEY
- EXA_WEBSET_ID
- SYNC_SECRET, optional for deployed sync endpoint
- CRON_SECRET, used by Vercel Cron for deployed Webset sync
- EXA_ANSWER_BASE_URL, optional Exa Answer API base override
- BLOB_READ_WRITE_TOKEN, recommended for deployed persistence
- DATA_STORE_BACKEND, set to a non-file value or omit when using Vercel Blob
- APP_BASE_URL, for generated prospect URLs
- LOGO_PROVIDER, favicon, clearbit, or none
- STUDIO_ADMIN_SECRET, live creation passcode for hosted Signal Studio Webset creation
- ACCOUNT_SUGGESTION_SECRET, optional protected suggestion refresh secret

## API

- GET /api/health
- GET /api/sync
- POST /api/sync
- GET /api/cron/sync
- GET /api/signals
- GET /api/accounts
- GET /api/accounts/{domain}
- GET /api/accounts/{domain}/suggestions
- GET /api/studios
- POST /api/studios
- GET /api/studios/{slug}
- GET /api/studios/{slug}/webset-items
- GET /api/cron/account-suggestions
- GET /api/agent/manifest

Signal and account endpoints accept `territory`, `segment`/`accountSegment`, and `reviewStatus=approved`, `needs_review`, `rejected`, or `unreviewed` after a sanitizer run.

## CLI

- npm run backend:sync
- npm run backend:inspect
- npm run backend:create-searches
- npm run backend:create-searches -- --apply
- npm run backend:create-studio -- --account-domain example.com
- npm run backend:review-signals-exa -- --limit 10
- npm run backend:review-accounts-exa -- --limit 25

## Exa Answer Row Sanitizer

The row sanitizer uses Exa's Answer endpoint with structured output.

- It reads synced signal rows from the backend store.
- It reviews only rows that are new or whose row hash changed, unless `--all` is passed.
- It stores structured review results in `reviews.json`.
- It checks whether the source evidence proves the claimed signal, not just whether the account is in ICP.

Useful commands:

- Dry run candidate rows: `npm run backend:review-signals-exa -- --dry-run --limit 10`
- Review next 10 rows: `npm run backend:review-signals-exa -- --limit 10`
- Review one row: `npm run backend:review-signals-exa -- --signal-id sig_...`
- Re-review everything: `npm run backend:review-signals-exa -- --all`

## App Contract

Internal one-page app:

- Use GET /api/accounts for the account feed and filter counts.
- Use GET /api/accounts?reviewStatus=approved for the sanitized account feed.
- Use GET /api/accounts/{domain} for the selected account detail/timeline.
- Use POST /api/studios to create a generated prospect page record.

Prospect page:

- Route should be /studio/{slug}.
- Use GET /api/studios/{slug}.
- Embed GET /api/studios/{slug}/webset-items for live, loading, or preview Webset evidence.
- Show Exa branding plus the prospect logo when available.
- Show the selected workflow, Webset query/criteria, freshness, and cited public-web results.

## Deployed Sync

The deployed app syncs the live Webset automatically through Vercel Cron:

- `vercel.json` schedules `GET /api/cron/sync` daily at 16:00 UTC.
- The cron route verifies `Authorization: Bearer $CRON_SECRET`.
- The route calls `syncWebsetToStore`, which reads current Webset items and writes normalized signals/accounts.
- Use Vercel Blob or another durable store for deployment. Local file storage is fine for development, but it is not reliable serverless persistence.

For local development or one-off repair, run:

npm run backend:sync

Manual deployed sync is still available:

POST /api/sync
Authorization: Bearer $SYNC_SECRET
