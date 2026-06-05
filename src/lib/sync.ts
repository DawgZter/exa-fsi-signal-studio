import { buildAccounts } from "./accounts";
import { signalLaneSchema, type SyncState } from "./domain";
import { getOptionalEnv } from "./env";
import { laneFromSearchQuery, normalizeWebsetItems } from "./normalize";
import { writeAccounts, writeSignals, writeSyncState } from "./store";
import { ExaWebsetsClient, enrichmentFieldMapFromWebset } from "./websets";

export type SyncOptions = {
  websetId?: string;
  maxItems?: number;
  write?: boolean;
};

export async function syncWebsetToStore(options: SyncOptions = {}): Promise<SyncState> {
  const websetId = options.websetId ?? getOptionalEnv("EXA_WEBSET_ID");
  if (!websetId) {
    throw new Error("Missing EXA_WEBSET_ID. Set it in the environment or pass --webset-id.");
  }

  const client = new ExaWebsetsClient();
  const webset = await client.getWebset(websetId);
  const enrichmentFieldById = enrichmentFieldMapFromWebset(webset);
  const searchLaneById = Object.fromEntries(
    (Array.isArray(webset.searches) ? webset.searches : [])
      .map((search) => {
        if (!search || typeof search !== "object") {
          return undefined;
        }
        const record = search as Record<string, unknown>;
        const id = typeof record.id === "string" ? record.id : undefined;
        const query = typeof record.query === "string" ? record.query : undefined;
        const metadata = record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>) : {};
        const laneId = typeof metadata.lane_id === "string" ? signalLaneSchema.safeParse(metadata.lane_id) : undefined;
        return id ? [id, laneId?.success ? laneId.data : laneFromSearchQuery(query)] : undefined;
      })
      .filter((entry): entry is [string, ReturnType<typeof laneFromSearchQuery>] => Boolean(entry)),
  );
  const rawItems = await client.listAllWebsetItems(websetId, { maxItems: options.maxItems });
  const signals = normalizeWebsetItems(rawItems, { websetId, enrichmentFieldById, searchLaneById });
  const accounts = buildAccounts(signals);
  const state: SyncState = {
    websetId,
    lastSyncedAt: new Date().toISOString(),
    signalsSynced: signals.length,
    accountsSynced: accounts.length,
    source: "websets",
  };

  if (options.write !== false) {
    await writeSignals(signals);
    await writeAccounts(accounts);
    await writeSyncState(state);
  }

  return state;
}
