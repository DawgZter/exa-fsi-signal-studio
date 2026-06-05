import { NextResponse } from "next/server";
import { getStoreDescription, readAccountSuggestions, readAccounts, readSignals, readStudios, readSyncState } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const [sync, signals, accounts, studios, accountSuggestions] = await Promise.all([
    readSyncState(),
    readSignals(),
    readAccounts(),
    readStudios(),
    readAccountSuggestions(),
  ]);
  return NextResponse.json({
    ok: true,
    service: "exa-fsi-signal-studio-backend",
    store: getStoreDescription(),
    sync,
    counts: {
      signals: signals.length,
      accounts: accounts.length,
      studios: studios.length,
      accountSuggestions: accountSuggestions.length,
    },
  });
}
