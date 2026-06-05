import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly expose = true,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonError(error: unknown, fallbackStatus = 500): NextResponse {
  const status = error instanceof HttpError ? error.status : fallbackStatus;
  const expose =
    error instanceof HttpError ? error.expose : status < 500 || process.env.NODE_ENV !== "production";
  const message = expose && error instanceof Error ? error.message : "Internal server error.";

  if (status >= 500) {
    console.error(error);
  }

  return NextResponse.json({ error: message }, { status });
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError("Request body must be valid JSON.", 400);
  }
}
