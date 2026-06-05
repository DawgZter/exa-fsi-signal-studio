import { getOptionalEnv, getRequiredEnv } from "./env";

export type ExaWebsetsClientOptions = {
  apiKey?: string;
  baseUrl?: string;
};

export type ExaRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export function enrichmentFieldMapFromWebset(webset: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    (Array.isArray(webset.enrichments) ? webset.enrichments : [])
      .map((enrichment) => {
        if (!enrichment || typeof enrichment !== "object") {
          return undefined;
        }
        const record = enrichment as Record<string, unknown>;
        const id = typeof record.id === "string" ? record.id : undefined;
        const metadata = record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>) : {};
        const field = typeof metadata.field === "string" ? metadata.field : undefined;
        return id && field ? [id, field] : undefined;
      })
      .filter((entry): entry is [string, string] => Boolean(entry)),
  );
}

export class ExaWebsetsClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: ExaWebsetsClientOptions = {}) {
    this.apiKey = options.apiKey ?? getRequiredEnv("EXA_API_KEY");
    this.baseUrl = (options.baseUrl ?? getOptionalEnv("EXA_WEBSETS_BASE_URL") ?? "https://api.exa.ai/websets/v0").replace(/\/$/, "");
  }

  async request<T>(pathname: string, options: ExaRequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Exa Websets API ${response.status} ${response.statusText}: ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  getWebset(websetId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/websets/${encodeURIComponent(websetId)}`);
  }

  createWebset(payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("/websets", {
      method: "POST",
      body: payload,
    });
  }

  listWebsetItems(
    websetId: string,
    options: { cursor?: string; limit?: number } = {},
  ): Promise<{ data?: unknown[]; items?: unknown[]; nextCursor?: string; cursor?: string; hasMore?: boolean }> {
    return this.request(`/websets/${encodeURIComponent(websetId)}/items`, {
      query: {
        cursor: options.cursor,
        limit: options.limit ?? 100,
      },
    });
  }

  async listAllWebsetItems(websetId: string, options: { limit?: number; maxItems?: number } = {}): Promise<unknown[]> {
    const items: unknown[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.listWebsetItems(websetId, { cursor, limit: options.limit ?? 100 });
      const pageItems = page.data ?? page.items ?? [];
      items.push(...pageItems);
      cursor = page.nextCursor ?? page.cursor;
      if (options.maxItems && items.length >= options.maxItems) {
        return items.slice(0, options.maxItems);
      }
    } while (cursor);

    return items;
  }

  createSearch(websetId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/websets/${encodeURIComponent(websetId)}/searches`, {
      method: "POST",
      body: payload,
    });
  }

  cancelSearch(websetId: string, searchId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(
      `/websets/${encodeURIComponent(websetId)}/searches/${encodeURIComponent(searchId)}/cancel`,
      {
        method: "POST",
      },
    );
  }

  createMonitor(payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("/monitors", {
      method: "POST",
      body: payload,
    });
  }

  updateMonitor(monitorId: string, payload: unknown): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/monitors/${encodeURIComponent(monitorId)}`, {
      method: "PATCH",
      body: payload,
    });
  }

  deleteWebsetItem(websetId: string, itemId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(
      `/websets/${encodeURIComponent(websetId)}/items/${encodeURIComponent(itemId)}`,
      {
        method: "DELETE",
      },
    );
  }
}
