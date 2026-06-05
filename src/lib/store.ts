import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  accountRecordSchema,
  accountWebsetSuggestionSchema,
  signalRecordSchema,
  signalReviewSchema,
  signalStudioSchema,
  syncStateSchema,
  type AccountRecord,
  type AccountWebsetSuggestion,
  type SignalRecord,
  type SignalReview,
  type SignalStudio,
  type SyncState,
} from "./domain";
import { getOptionalEnv } from "./env";

type StoreKey = "signals" | "accounts" | "studios" | "reviews" | "account-suggestions" | "sync-state";

const fileNames: Record<StoreKey, string> = {
  signals: "signals.json",
  accounts: "accounts.json",
  studios: "studios.json",
  reviews: "reviews.json",
  "account-suggestions": "account-suggestions.json",
  "sync-state": "sync-state.json",
};

function storeRoot(): string {
  const configuredPath = getOptionalEnv("SIGNAL_STORE_PATH");
  if (!configuredPath) {
    return path.join(/*turbopackIgnore: true*/ process.cwd(), ".local", "fsi-signal-studio");
  }
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(/*turbopackIgnore: true*/ process.cwd(), configuredPath);
}

function storeFilePath(key: StoreKey): string {
  return path.join(storeRoot(), fileNames[key]);
}

function seedFilePath(key: StoreKey): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "seed", "fsi-signal-studio", fileNames[key]);
}

function blobStoreEnabled(): boolean {
  return Boolean(getOptionalEnv("BLOB_READ_WRITE_TOKEN")) && getOptionalEnv("DATA_STORE_BACKEND") !== "file";
}

function blobPath(key: StoreKey): string {
  const prefix = getOptionalEnv("STORE_PREFIX") ?? "fsi-signal-studio";
  return `${prefix}/${fileNames[key]}`;
}

function blobAccess(): "public" | "private" {
  return getOptionalEnv("BLOB_ACCESS") === "public" ? "public" : "private";
}

async function readBlobJson<T>(key: StoreKey): Promise<T | undefined> {
  const mod = await import("@vercel/blob");
  const get = mod.get as unknown as (
    pathname: string,
    options: Record<string, unknown>,
  ) => Promise<{ stream: ReadableStream<Uint8Array> | null } | null>;
  const targetPath = blobPath(key);
  const result = await get(targetPath, { access: blobAccess(), useCache: false });
  if (!result?.stream) {
    return undefined;
  }
  return (await new Response(result.stream).json()) as T;
}

async function writeBlobJson<T>(key: StoreKey, value: T): Promise<void> {
  const mod = await import("@vercel/blob");
  const put = mod.put as unknown as (pathname: string, body: string, options: Record<string, unknown>) => Promise<unknown>;
  await put(blobPath(key), JSON.stringify(value, null, 2), {
    access: blobAccess(),
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readFileJson<T>(key: StoreKey): Promise<T | undefined> {
  try {
    const raw = await readFile(storeFilePath(key), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return readSeedJson<T>(key);
    }
    throw error;
  }
}

async function readSeedJson<T>(key: StoreKey): Promise<T | undefined> {
  try {
    const raw = await readFile(seedFilePath(key), "utf8");
    const parsed = JSON.parse(raw) as T;
    if (key === "sync-state" && parsed && typeof parsed === "object") {
      return { ...(parsed as Record<string, unknown>), source: "seed" } as T;
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function writeFileJson<T>(key: StoreKey, value: T): Promise<void> {
  await mkdir(storeRoot(), { recursive: true });
  await writeFile(storeFilePath(key), JSON.stringify(value, null, 2), "utf8");
}

async function readJson<T>(key: StoreKey, fallback: T): Promise<T> {
  const value = blobStoreEnabled() ? await readBlobJson<T>(key) : await readFileJson<T>(key);
  return value ?? fallback;
}

async function writeJson<T>(key: StoreKey, value: T): Promise<void> {
  if (blobStoreEnabled()) {
    await writeBlobJson(key, value);
    return;
  }
  await writeFileJson(key, value);
}

export async function readSignals(): Promise<SignalRecord[]> {
  return signalRecordSchema.array().parse(await readJson("signals", []));
}

export async function writeSignals(signals: SignalRecord[]): Promise<void> {
  await writeJson("signals", signalRecordSchema.array().parse(signals));
}

export async function readAccounts(): Promise<AccountRecord[]> {
  return accountRecordSchema.array().parse(await readJson("accounts", []));
}

export async function writeAccounts(accounts: AccountRecord[]): Promise<void> {
  await writeJson("accounts", accountRecordSchema.array().parse(accounts));
}

export async function readStudios(): Promise<SignalStudio[]> {
  return signalStudioSchema.array().parse(await readJson("studios", []));
}

export async function readReviews(): Promise<SignalReview[]> {
  return signalReviewSchema.array().parse(await readJson("reviews", []));
}

export async function writeReviews(reviews: SignalReview[]): Promise<void> {
  await writeJson("reviews", signalReviewSchema.array().parse(reviews));
}

export async function upsertReviews(reviews: SignalReview[]): Promise<void> {
  const current = await readReviews();
  const reviewKey = (review: SignalReview) => `${review.signalId}:${review.rowHash}:${review.reviewerModel}`;
  const uniqueIncoming = Array.from(new Map(reviews.map((review) => [reviewKey(review), review])).values());
  const incomingKeys = new Set(uniqueIncoming.map(reviewKey));
  const next = [...uniqueIncoming, ...current.filter((review) => !incomingKeys.has(reviewKey(review)))];
  await writeReviews(next);
}

export async function readAccountSuggestions(): Promise<AccountWebsetSuggestion[]> {
  return accountWebsetSuggestionSchema.array().parse(await readJson("account-suggestions", []));
}

export async function writeAccountSuggestions(suggestions: AccountWebsetSuggestion[]): Promise<void> {
  await writeJson("account-suggestions", accountWebsetSuggestionSchema.array().parse(suggestions));
}

export async function upsertAccountSuggestions(suggestions: AccountWebsetSuggestion[]): Promise<void> {
  const current = await readAccountSuggestions();
  const suggestionKey = (suggestion: AccountWebsetSuggestion) => suggestion.companyDomain;
  const uniqueIncoming = Array.from(new Map(suggestions.map((suggestion) => [suggestionKey(suggestion), suggestion])).values());
  const incomingKeys = new Set(uniqueIncoming.map(suggestionKey));
  const next = [...uniqueIncoming, ...current.filter((suggestion) => !incomingKeys.has(suggestionKey(suggestion)))];
  await writeAccountSuggestions(next);
}

export async function writeStudios(studios: SignalStudio[]): Promise<void> {
  await writeJson("studios", signalStudioSchema.array().parse(studios));
}

export async function upsertStudio(studio: SignalStudio): Promise<void> {
  const studios = await readStudios();
  const next = [studio, ...studios.filter((item) => item.slug !== studio.slug && item.id !== studio.id)];
  await writeStudios(next);
}

export async function getStudio(slug: string): Promise<SignalStudio | undefined> {
  const studios = await readStudios();
  return studios.find((studio) => studio.slug === slug || studio.id === slug);
}

export async function readSyncState(): Promise<SyncState> {
  return syncStateSchema.parse(
    await readJson("sync-state", {
      source: "none",
      signalsSynced: 0,
      accountsSynced: 0,
    }),
  );
}

export async function writeSyncState(state: SyncState): Promise<void> {
  await writeJson("sync-state", syncStateSchema.parse(state));
}

export function getStoreDescription(): { backend: "blob" | "file"; location: string } {
  if (blobStoreEnabled()) {
    return { backend: "blob", location: blobPath("signals").replace(/\/signals\.json$/, "") };
  }
  return { backend: "file", location: storeRoot() };
}
