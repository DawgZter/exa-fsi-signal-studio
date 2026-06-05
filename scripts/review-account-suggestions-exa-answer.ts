import { config } from "dotenv";
import { generateAccountSuggestion, refreshDueAccountSuggestions } from "../src/lib/account-suggestions";
import { getOptionalEnv } from "../src/lib/env";

config({ path: ".env.local" });

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

const domain = getArg("--domain") ?? getArg("--account-domain");
const limit = parsePositiveInt(getArg("--limit") ?? getOptionalEnv("ACCOUNT_SUGGESTION_CLI_LIMIT"), 10);
const force = hasFlag("--force") || hasFlag("--all");
const includeText = !hasFlag("--no-text");

if (domain) {
  const result = await generateAccountSuggestion(domain, { force, includeText });
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /answer",
        domain: result.account.companyDomain,
        generated: result.generated,
        stale: result.stale,
        fitScore: result.suggestion.fitScore,
        status: result.suggestion.status,
        optionCount: result.options.length,
        requestId: result.requestId,
        citationCount: result.citationCount,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const result = await refreshDueAccountSuggestions({ limit, force, includeText });
console.log(JSON.stringify({ endpoint: "POST /answer", ...result }, null, 2));
