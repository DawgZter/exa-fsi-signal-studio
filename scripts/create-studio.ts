import { config } from "dotenv";
import { createSignalStudio } from "../src/lib/studios";

config({ path: ".env.local" });

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const accountDomain = getArg("--account-domain");
if (!accountDomain) {
  throw new Error("Usage: npm run backend:create-studio -- --account-domain example.com [--signal-id sig_...] [--workflow \"Mortgage guidance\"]");
}

const signalIds = process.argv
  .map((value, index) => (value === "--signal-id" ? process.argv[index + 1] : undefined))
  .filter((value): value is string => Boolean(value));

const result = await createSignalStudio({
  accountDomain,
  signalIds: signalIds.length ? signalIds : undefined,
  workflowOverride: getArg("--workflow"),
  repNote: getArg("--rep-note"),
  createdBy: "cli",
});

console.log(JSON.stringify(result, null, 2));
