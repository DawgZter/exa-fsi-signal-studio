import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { signalReviewSchema, type SignalRecord, type SignalReview } from "../src/lib/domain";
import { ExaAnswerClient } from "../src/lib/exa-answer";
import { getOptionalEnv } from "../src/lib/env";
import {
  buildSignalReviewPrompt,
  chunk,
  normalizeCorrected,
  normalizeProspectWebsetSuggestion,
  rowHash,
  signalReviewBatchResponseSchema,
  type SignalReviewBatchResponse,
} from "../src/lib/signal-review-context";
import { readReviews, readSignals, upsertReviews } from "../src/lib/store";

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

async function loadOutputSchema(): Promise<Record<string, unknown>> {
  const schemaPath = path.join(process.cwd(), "schemas", "signal-review-batch.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();
  const fence = String.fromCharCode(96, 96, 96);
  if (trimmed.startsWith(fence)) {
    const firstNewline = trimmed.indexOf("\n");
    const lastFence = trimmed.lastIndexOf(fence);
    if (firstNewline >= 0 && lastFence > firstNewline) {
      return JSON.parse(trimmed.slice(firstNewline + 1, lastFence).trim());
    }
  }
  return JSON.parse(trimmed);
}

function parseAnswer(answer: unknown): SignalReviewBatchResponse {
  if (typeof answer === "string") {
    return signalReviewBatchResponseSchema.parse(parseJsonString(answer));
  }
  return signalReviewBatchResponseSchema.parse(answer);
}

async function runExaAnswerReview(
  signals: SignalRecord[],
  options: { includeText: boolean },
): Promise<{ response: SignalReviewBatchResponse; requestId?: string; citationCount: number; costDollars?: Record<string, unknown> }> {
  const client = new ExaAnswerClient();
  const payload = await client.answer({
    query: buildSignalReviewPrompt(signals, "exa-answer"),
    text: options.includeText,
    stream: false,
    outputSchema: await loadOutputSchema(),
  });

  return {
    response: parseAnswer(payload.answer),
    requestId: payload.requestId,
    citationCount: payload.citations?.length ?? 0,
    costDollars: payload.costDollars,
  };
}

const allSignals = await readSignals();
const existingReviews = await readReviews();
const signalIdFilter = getArg("--signal-id");
const limit = Number(getArg("--limit") ?? "");
const requestedBatchSize = parsePositiveInt(getArg("--batch-size") ?? getOptionalEnv("EXA_ANSWER_REVIEW_BATCH_SIZE"), 1);
const batchSize = Math.min(requestedBatchSize, 3);
const reviewAll = hasFlag("--all");
const dryRun = hasFlag("--dry-run");
const includeText = !hasFlag("--no-text");
const reviewerModel = getArg("--reviewer-model") ?? "exa-answer/output-schema";
const existingReviewBySignal = new Map(existingReviews.filter((review) => review.reviewerModel === reviewerModel).map((review) => [review.signalId, review]));

let candidates = allSignals.filter((signal) => {
  if (signalIdFilter && signal.id !== signalIdFilter) {
    return false;
  }
  const hash = rowHash(signal);
  const existing = existingReviewBySignal.get(signal.id);
  return reviewAll || !existing || existing.rowHash !== hash;
});

if (Number.isFinite(limit) && limit > 0) {
  candidates = candidates.slice(0, limit);
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        endpoint: "POST /answer",
        reviewerModel,
        includeText,
        requestedBatchSize,
        batchSize,
        candidates: candidates.map((signal) => ({
          signalId: signal.id,
          accountName: signal.accountName,
          companyDomain: signal.companyDomain,
          lane: signal.lane,
          sourceUrl: signal.sourceUrl,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const reviewed: SignalReview[] = [];
const requestIds: string[] = [];
let citationCount = 0;

for (const batch of chunk(candidates, batchSize)) {
  const response = await runExaAnswerReview(batch, { includeText });
  if (response.requestId) {
    requestIds.push(response.requestId);
  }
  citationCount += response.citationCount;

  const byId = new Map(batch.map((signal) => [signal.id, signal]));
  const now = new Date().toISOString();
  for (const review of response.response.reviews) {
    const signal = byId.get(review.signalId);
    if (!signal) {
      continue;
    }
    reviewed.push(
      signalReviewSchema.parse({
        ...review,
        corrected: normalizeCorrected(review),
        prospectWebsetSuggestion: normalizeProspectWebsetSuggestion(review),
        rowHash: rowHash(signal),
        reviewerModel,
        reviewedAt: now,
      }),
    );
  }
}

const uniqueReviewed = Array.from(
  new Map(reviewed.map((review) => [`${review.signalId}:${review.rowHash}:${review.reviewerModel}`, review])).values(),
);

if (uniqueReviewed.length) {
  await upsertReviews(uniqueReviewed);
}

console.log(
  JSON.stringify(
    {
      endpoint: "POST /answer",
      reviewed: uniqueReviewed.length,
      remaining: Math.max(0, candidates.length - uniqueReviewed.length),
      requestIds,
      citationCount,
      status: uniqueReviewed.reduce<Record<string, number>>((acc, review) => {
        acc[review.status] = (acc[review.status] ?? 0) + 1;
        return acc;
      }, {}),
    },
    null,
    2,
  ),
);
