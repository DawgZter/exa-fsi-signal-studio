import { NextResponse } from "next/server";
import { signalLanes } from "@/lib/lanes";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: "Exa FSI Signal Studio Backend",
    description:
      "Backend contract for a one-page AE signal workspace and generated prospect demo pages. Secrets stay in environment variables, never in the repo.",
    env: {
      required: ["EXA_API_KEY", "EXA_WEBSET_ID"],
      optional: [
        "SYNC_SECRET",
        "CRON_SECRET",
        "APP_BASE_URL",
        "SIGNAL_STORE_PATH",
        "BLOB_READ_WRITE_TOKEN",
        "DATA_STORE_BACKEND",
        "LOGO_PROVIDER",
        "EXA_ANSWER_BASE_URL",
        "EXA_ANSWER_REVIEW_BATCH_SIZE",
        "ACCOUNT_SUGGESTION_SECRET",
        "ACCOUNT_SUGGESTION_CRON_LIMIT",
        "ACCOUNT_SUGGESTIONS_ON_SYNC",
      ],
    },
    api: {
      health: "GET /api/health",
      syncStatus: "GET /api/sync",
      syncNow: "POST /api/sync",
      cronSync: "GET /api/cron/sync",
      signals: "GET /api/signals?lane=customer_ai_assistants&confidence=high&reviewStatus=approved",
      accounts: "GET /api/accounts?territory=North%20America&segment=Strategic%20Enterprise&reviewStatus=approved",
      accountDetail: "GET /api/accounts/{domain}",
      accountSuggestions: "GET /api/accounts/{domain}/suggestions",
      refreshAccountSuggestion: "POST /api/accounts/{domain}/suggestions",
      createStudio: "POST /api/studios",
      getStudio: "GET /api/studios/{slug}",
      studioWebsetItems: "GET /api/studios/{slug}/webset-items?maxItems=30",
      backfillAccountSuggestions: "GET /api/cron/account-suggestions?limit=10",
    },
    cli: {
      sync: "npm run backend:sync",
      inspectStore: "npm run backend:inspect",
      dryRunSearchPayloads: "npm run backend:create-searches",
      applySearchPayloads: "npm run backend:create-searches -- --apply",
      createStudio: "npm run backend:create-studio -- --account-domain example.com",
      reviewSignalsWithExaAnswer: "npm run backend:review-signals-exa -- --limit 10",
    },
    lanes: signalLanes,
  });
}
