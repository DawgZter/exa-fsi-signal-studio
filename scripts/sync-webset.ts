import { config } from "dotenv";
import { syncWebsetToStore } from "../src/lib/sync";

config({ path: ".env.local" });

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const websetId = getArg("--webset-id");
const maxItemsRaw = getArg("--max-items");
const maxItems = maxItemsRaw ? Number(maxItemsRaw) : undefined;

const state = await syncWebsetToStore({
  websetId,
  maxItems: Number.isFinite(maxItems) ? maxItems : undefined,
});

console.log(JSON.stringify(state, null, 2));
