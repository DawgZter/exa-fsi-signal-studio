import { buildAccounts, signalFacets } from "@/lib/accounts";
import { toClientSignals } from "@/lib/client-signals";
import { readSignals, readSyncState } from "@/lib/store";
import { Workspace } from "@/components/workspace/workspace";
import type { AccountsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const signals = await readSignals();
  const accounts = buildAccounts(signals);
  const facets = signalFacets(signals);
  const sync = await readSyncState();

  const initial: AccountsResponse = {
    accounts,
    count: accounts.length,
    signalCount: signals.length,
    facets,
    sync,
  };

  return <Workspace initial={initial} signals={toClientSignals(signals)} />;
}
