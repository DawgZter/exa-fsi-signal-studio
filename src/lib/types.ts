import type {
  AccountRecord,
  AccountWebsetSuggestion,
  Confidence,
  SignalLane,
  SignalRecord,
  SignalStudio,
  SourceQuality,
  StudioOption,
  SyncState,
} from "@/lib/domain";
import type { ProspectWebsetResult, ProspectWebsetResultsResponse } from "@/lib/prospect-results";

export type {
  AccountRecord,
  AccountWebsetSuggestion,
  Confidence,
  SignalLane,
  SignalRecord,
  SignalStudio,
  SourceQuality,
  StudioOption,
  SyncState,
};

export type Facets = Record<string, Record<string, number>>;

/** Signal record sent to public clients without raw Webset/internal routing metadata. */
export type ClientSignal = Omit<SignalRecord, "raw" | "websetId" | "websetItemId" | "searchId" | "monitorId">;

export interface AccountsResponse {
  accounts: AccountRecord[];
  count: number;
  signalCount: number;
  facets: Facets;
  sync: SyncState;
}

export interface AccountDetailResponse {
  account: AccountRecord;
  signals: ClientSignal[];
  facets: Facets;
  sync: SyncState;
}

export interface CreateStudioResponse {
  studio: SignalStudio;
  url: string;
  liveProvisioning?: {
    requested: boolean;
    authorized: boolean;
    provisioned: boolean;
    mode: "live" | "preview";
    reason?: "missing_exa_api_key";
  };
}

export interface CreateStudioUnauthorizedResponse {
  error: string;
  liveProvisioning: {
    requested: true;
    authorized: false;
    provisioned: false;
    mode: "unauthorized";
  };
}

export interface AccountSuggestionsResponse {
  account: AccountRecord;
  suggestion: AccountWebsetSuggestion;
  options: StudioOption[];
  stale: boolean;
  generated: boolean;
}

export type { ProspectWebsetResult };
export type StudioWebsetItemsResponse = ProspectWebsetResultsResponse;
