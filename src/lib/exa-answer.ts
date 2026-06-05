import { getOptionalEnv, getRequiredEnv } from "./env";

export type ExaAnswerClientOptions = {
  apiKey?: string;
  baseUrl?: string;
};

export type ExaAnswerRequest = {
  query: string;
  text?: boolean;
  stream?: false;
  outputSchema?: unknown;
};

export type ExaAnswerCitation = {
  title?: string;
  url?: string;
  publishedDate?: string;
  author?: string;
  id?: string;
  image?: string;
  favicon?: string;
  text?: string;
};

export type ExaAnswerResponse<TAnswer = unknown> = {
  answer: TAnswer;
  requestId?: string;
  citations?: ExaAnswerCitation[];
  costDollars?: Record<string, unknown>;
};

export class ExaAnswerClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: ExaAnswerClientOptions = {}) {
    this.apiKey = options.apiKey ?? getRequiredEnv("EXA_API_KEY");
    this.baseUrl = (options.baseUrl ?? getOptionalEnv("EXA_ANSWER_BASE_URL") ?? "https://api.exa.ai").replace(/\/$/, "");
  }

  async answer<TAnswer = unknown>(payload: ExaAnswerRequest): Promise<ExaAnswerResponse<TAnswer>> {
    const response = await fetch(`${this.baseUrl}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Exa Answer API ${response.status} ${response.statusText}: ${text}`);
    }

    return (await response.json()) as ExaAnswerResponse<TAnswer>;
  }
}
