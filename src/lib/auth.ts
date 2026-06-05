import { getOptionalEnv } from "./env";
import { HttpError } from "./http";

function bearerToken(request: Request): string | undefined {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || undefined;
}

function requestSecret(request: Request, headerName: string): string | undefined {
  return request.headers.get(headerName)?.trim() || undefined;
}

function matchesSecret(request: Request, secret: string, headerNames: string[]): boolean {
  const candidates = [bearerToken(request), ...headerNames.map((header) => requestSecret(request, header))];
  return candidates.some((candidate) => candidate === secret);
}

function liveStudioSecret(): string | undefined {
  return getOptionalEnv("STUDIO_ADMIN_SECRET");
}

export function canProvisionLiveStudio(request: Request): boolean {
  const secret = liveStudioSecret();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return matchesSecret(request, secret, ["x-studio-secret"]);
}

export function assertSyncAuthorized(request: Request): void {
  const secret = getOptionalEnv("SYNC_SECRET") ?? getOptionalEnv("CRON_SECRET");
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    throw new HttpError("Unauthorized sync request.", 401);
  }

  if (!matchesSecret(request, secret, ["x-sync-secret"])) {
    throw new HttpError("Unauthorized sync request.", 401);
  }
}

export function assertSuggestionAuthorized(request: Request): void {
  const secret =
    getOptionalEnv("ACCOUNT_SUGGESTION_SECRET") ??
    getOptionalEnv("SYNC_SECRET") ??
    getOptionalEnv("CRON_SECRET") ??
    getOptionalEnv("STUDIO_ADMIN_SECRET");
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    throw new HttpError("Unauthorized account suggestion request.", 401);
  }

  if (!matchesSecret(request, secret, ["x-account-suggestion-secret", "x-sync-secret", "x-studio-secret"])) {
    throw new HttpError("Unauthorized account suggestion request.", 401);
  }
}

export function parseBoundedPositiveInt(value: string | null, name: string, max: number): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) {
    throw new HttpError(`${name} must be a positive integer no greater than ${max}.`, 400);
  }
  return parsed;
}
