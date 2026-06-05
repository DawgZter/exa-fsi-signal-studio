import { createHash } from "node:crypto";
import {
  signalRecordSchema,
  type Confidence,
  type SignalLane,
  type SignalRecord,
  type SourceQuality,
} from "./domain";
import { signalLanes } from "./lanes";
import { domainFromUrl, normalizeDomain } from "./logo";

type FieldMap = Map<string, string>;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function stableId(parts: Array<string | undefined>): string {
  return createHash("sha1")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex")
    .slice(0, 16);
}

function stringifyValue(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return value.trim() || undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map(stringifyValue).filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = record.value ?? record.answer ?? record.result ?? record.text ?? record.summary ?? record.name ?? record.title;
    return stringifyValue(preferred) ?? JSON.stringify(value);
  }
  return undefined;
}

function addField(fields: FieldMap, key: string, value: unknown): void {
  const stringValue = stringifyValue(value);
  if (!stringValue) {
    return;
  }
  const normalized = normalizeKey(key);
  if (!fields.has(normalized)) {
    fields.set(normalized, stringValue);
  }
}

function addEnrichmentResults(
  item: Record<string, unknown>,
  fields: FieldMap,
  enrichmentFieldById: Record<string, string> = {},
): void {
  const enrichments = Array.isArray(item.enrichments) ? item.enrichments : [];
  for (const enrichment of enrichments) {
    if (!enrichment || typeof enrichment !== "object") {
      continue;
    }
    const record = enrichment as Record<string, unknown>;
    const enrichmentId = stringifyValue(record.enrichmentId);
    const field = enrichmentId ? enrichmentFieldById[enrichmentId] : undefined;
    if (!field) {
      continue;
    }
    addField(fields, field, record.result);
    addField(fields, `${field}_reasoning`, record.reasoning);
  }
}

function collectFields(value: unknown, fields: FieldMap, prefix = ""): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFields(item, fields, prefix);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  const label = stringifyValue(record.name ?? record.label ?? record.title ?? record.field ?? record.key);
  if (label) {
    addField(fields, label, record.value ?? record.answer ?? record.result ?? record.text ?? record.summary);
  }

  for (const [key, fieldValue] of Object.entries(record)) {
    const fieldKey = prefix ? `${prefix}_${key}` : key;
    addField(fields, fieldKey, fieldValue);
    if (fieldValue && typeof fieldValue === "object") {
      collectFields(fieldValue, fields, fieldKey);
    }
  }
}

function readField(fields: FieldMap, candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const value = fields.get(normalizeKey(candidate));
    if (value) {
      return value;
    }
  }
  return undefined;
}

function normalizeConfidence(value: string | undefined, sourceQuality: SourceQuality): Confidence {
  const lower = value?.toLowerCase() ?? "";
  if (lower.includes("high")) {
    return "high";
  }
  if (lower.includes("low") || lower.includes("noise") || lower.includes("weak")) {
    return "low";
  }
  if (sourceQuality === "official" || sourceQuality === "trusted") {
    return "high";
  }
  if (sourceQuality === "low") {
    return "low";
  }
  return "medium";
}

function normalizeSourceQuality(value: string | undefined, sourceType: string): SourceQuality {
  const lower = `${value ?? ""} ${sourceType}`.toLowerCase();
  if (lower.includes("official") || lower.includes("company source")) {
    return "official";
  }
  if (lower.includes("trusted") || lower.includes("trade") || lower.includes("press") || lower.includes("news")) {
    return "trusted";
  }
  if (lower.includes("low") || lower.includes("weak") || lower.includes("noise")) {
    return "low";
  }
  if (lower.includes("medium") || lower.includes("linkedin") || lower.includes("vendor")) {
    return "medium";
  }
  return "unknown";
}

export function normalizeSignalLane(value: string | undefined): SignalLane {
  const lower = value?.toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? "";
  if (lower.includes("customer") || lower.includes("assistant") || lower.includes("help_center")) {
    return "customer_ai_assistants";
  }
  if (lower.includes("official") || lower.includes("launch")) {
    return "official_ai_agent_launches";
  }
  if (lower.includes("leadership") || lower.includes("team")) {
    return "ai_leadership_team";
  }
  if (lower.includes("job") || lower.includes("hiring")) {
    return "job_posts_hiring";
  }
  if (lower.includes("webinar") || lower.includes("whitepaper")) {
    return "webinars_whitepapers";
  }
  if (lower.includes("conference") || lower.includes("speaker")) {
    return "conference_speaker";
  }
  if (lower.includes("governance") || lower.includes("model_risk") || lower.includes("risk")) {
    return "governance_model_risk";
  }
  if (lower.includes("vendor") || lower.includes("partner_announcement") || lower.includes("customer_story")) {
    return "vendor_partner_announcements";
  }
  if (lower.includes("procurement") || lower.includes("rfp") || lower.includes("tender")) {
    return "procurement_rfp";
  }
  if (lower.includes("marketplace") || lower.includes("integration")) {
    return "partner_marketplace";
  }
  return "unknown";
}

function parseTags(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeSourceDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  const datePart = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && datePart > new Date().toISOString().slice(0, 10)) {
    return undefined;
  }
  return trimmed;
}

const officialDomainAliases: Record<string, { domain: string; accountName: string }> = {
  "careers.bankofamerica.com": { domain: "bankofamerica.com", accountName: "Bank of America" },
  "newsroom.bankofamerica.com": { domain: "bankofamerica.com", accountName: "Bank of America" },
  "careers.southstatebank.com": { domain: "southstatebank.com", accountName: "SouthState Bank" },
  "careers.usbank.com": { domain: "usbank.com", accountName: "U.S. Bank" },
  "corporate.visa.com": { domain: "visa.com", accountName: "Visa Inc." },
  "investor.travelers.com": { domain: "travelers.com", accountName: "The Travelers Companies, Inc." },
  "jobs.citi.com": { domain: "citigroup.com", accountName: "Citi" },
  "jobs.scotiabank.com": { domain: "scotiabank.com", accountName: "Scotiabank" },
  "scotiabank.investorroom.com": { domain: "scotiabank.com", accountName: "Scotiabank" },
};

function officialDomainAlias(domain: string | undefined): { domain: string; accountName: string } | undefined {
  const normalized = normalizeDomain(domain);
  return normalized ? officialDomainAliases[normalized] : undefined;
}

function collapseOfficialSubdomain(domain: string | undefined): string | undefined {
  const normalized = normalizeDomain(domain);
  const labels = normalized.split(".");
  const officialPrefixes = new Set(["careers", "career", "jobs", "job", "newsroom", "investor", "investors", "ir", "corporate"]);
  if (labels.length < 3 || !officialPrefixes.has(labels[0])) {
    return undefined;
  }
  return labels.slice(1).join(".");
}

function humanizeDomainAccount(domain: string): string {
  const firstLabel = domain.split(".")[0] ?? domain;
  return firstLabel
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const territoryByDomain: Record<string, string> = {
  "aib.ie": "EMEA",
  "alipay.com": "APAC",
  "allspringglobal.com": "North America",
  "ant-intl.com": "APAC",
  "au.bank.in": "APAC",
  "aviva.com": "EMEA",
  "bankofamerica.com": "North America",
  "barclays.com": "EMEA",
  "better.com": "North America",
  "bnpparibas.com": "EMEA",
  "bny.com": "North America",
  "broadridge.com": "North America",
  "caissedesdepots.fr": "EMEA",
  "caixabank.com": "EMEA",
  "calstrs.com": "North America",
  "capitalone.com": "North America",
  "carsongroup.com": "North America",
  "cimbniaga.co.id": "APAC",
  "citigroup.com": "North America",
  "citizensbank.com": "North America",
  "commbank.com.au": "APAC",
  "commerzbank.com": "EMEA",
  "customersbank.com": "North America",
  "cvshealth.com": "North America",
  "datavisor.com": "North America",
  "dbs.com": "APAC",
  "du.co": "EMEA",
  "erieinsurance.com": "North America",
  "fiserv.com": "North America",
  "fisglobal.com": "North America",
  "fosterdenovo.com": "EMEA",
  "freedommortgage.com": "North America",
  "gf.com.cn": "APAC",
  "groupebpce.com": "EMEA",
  "hangseng.com": "APAC",
  "hanaw.com": "APAC",
  "hsbc.com": "EMEA",
  "ice.com": "North America",
  "ing.com": "EMEA",
  "interactivebrokers.com": "North America",
  "jkb.bank.in": "APAC",
  "juliusbaer.com": "EMEA",
  "kadirurbank.com": "APAC",
  "kakaobank.com": "APAC",
  "kraken.com": "North America",
  "labanquepostale.fr": "EMEA",
  "lemonade.com": "North America",
  "lloydsbankinggroup.com": "EMEA",
  "lseg.com": "EMEA",
  "mambu.com": "EMEA",
  "manulife.com": "North America",
  "mastercard.com": "North America",
  "metacomp.ai": "APAC",
  "mexc.com": "APAC",
  "mizuhobank.co.jp": "APAC",
  "mozaiq.ai": "North America",
  "mpowered.co.uk": "EMEA",
  "mufg.jp": "APAC",
  "nab.com.au": "APAC",
  "natwestgroup.com": "EMEA",
  "ncino.com": "North America",
  "neohomeloans.com": "North America",
  "newrez.com": "North America",
  "nice.com": "EMEA",
  "nordea.com": "EMEA",
  "ocbc.com": "APAC",
  "oscilar.com": "North America",
  "patronuspartners.com": "EMEA",
  "piraeusbank.gr": "EMEA",
  "pismo.io": "LATAM",
  "public.com": "North America",
  "pureretirement.co.uk": "EMEA",
  "q2.com": "North America",
  "raymondjames.com": "North America",
  "revolut.com": "EMEA",
  "santander.com": "EMEA",
  "sardine.ai": "North America",
  "sbilife.co.in": "APAC",
  "sbito.co.th": "APAC",
  "scotiabank.com": "North America",
  "six-group.com": "EMEA",
  "southstatebank.com": "North America",
  "sygnum.com": "EMEA",
  "symphonyai.com": "North America",
  "td.com": "North America",
  "thinkmarkets.com": "EMEA",
  "tradeweb.com": "North America",
  "travelers.com": "North America",
  "trustbank.sg": "APAC",
  "ubs.com": "EMEA",
  "usbank.com": "North America",
  "uwm.com": "North America",
  "valr.com": "EMEA",
  "visa.com": "North America",
  "wedbush.com": "North America",
  "wellsfargo.com": "North America",
  "wooribank.com": "APAC",
  "zurich.com": "EMEA",
};

const territoryBySuffix: Array<[string, string]> = [
  [".com.au", "APAC"],
  [".co.id", "APAC"],
  [".co.in", "APAC"],
  [".co.jp", "APAC"],
  [".co.th", "APAC"],
  [".com.cn", "APAC"],
  [".bank.in", "APAC"],
  [".sg", "APAC"],
  [".jp", "APAC"],
  [".cn", "APAC"],
  [".in", "APAC"],
  [".fr", "EMEA"],
  [".gr", "EMEA"],
  [".ie", "EMEA"],
  [".co.uk", "EMEA"],
  [".uk", "EMEA"],
];

const segmentByDomain: Record<string, string> = {
  "alipay.com": "Digital Native / Fintech",
  "ant-intl.com": "Digital Native / Fintech",
  "better.com": "Digital Native / Fintech",
  "broadridge.com": "FSI Infrastructure",
  "datavisor.com": "FSI Infrastructure",
  "du.co": "FSI Infrastructure",
  "fiserv.com": "FSI Infrastructure",
  "fisglobal.com": "FSI Infrastructure",
  "ice.com": "FSI Infrastructure",
  "kraken.com": "Digital Native / Fintech",
  "lemonade.com": "Digital Native / Fintech",
  "mambu.com": "FSI Infrastructure",
  "metacomp.ai": "Digital Native / Fintech",
  "mexc.com": "Digital Native / Fintech",
  "mozaiq.ai": "FSI Infrastructure",
  "ncino.com": "FSI Infrastructure",
  "nice.com": "FSI Infrastructure",
  "oscilar.com": "FSI Infrastructure",
  "pismo.io": "FSI Infrastructure",
  "public.com": "Digital Native / Fintech",
  "q2.com": "FSI Infrastructure",
  "revolut.com": "Digital Native / Fintech",
  "sardine.ai": "FSI Infrastructure",
  "symphonyai.com": "FSI Infrastructure",
  "tradeweb.com": "FSI Infrastructure",
  "trustbank.sg": "Digital Native / Fintech",
  "valr.com": "Digital Native / Fintech",
};

const strategicEnterpriseDomains = new Set([
  "aib.ie",
  "aviva.com",
  "bankofamerica.com",
  "barclays.com",
  "bnpparibas.com",
  "bny.com",
  "capitalone.com",
  "citigroup.com",
  "commbank.com.au",
  "commerzbank.com",
  "cvshealth.com",
  "dbs.com",
  "fiserv.com",
  "fisglobal.com",
  "hsbc.com",
  "ing.com",
  "interactivebrokers.com",
  "lloydsbankinggroup.com",
  "lseg.com",
  "manulife.com",
  "mastercard.com",
  "mizuhoBank.co.jp".toLowerCase(),
  "morganstanley.com",
  "mufg.jp",
  "nab.com.au",
  "natwestgroup.com",
  "nordea.com",
  "ocbc.com",
  "raymondjames.com",
  "santander.com",
  "scotiabank.com",
  "td.com",
  "travelers.com",
  "ubs.com",
  "usbank.com",
  "visa.com",
  "wellsfargo.com",
  "zurich.com",
]);

function inferTerritory(domain: string): string {
  const normalized = normalizeDomain(domain);
  if (!normalized) {
    return "Global";
  }
  const exact = territoryByDomain[normalized];
  if (exact) {
    return exact;
  }
  const suffix = territoryBySuffix.find(([ending]) => normalized.endsWith(ending));
  return suffix?.[1] ?? "Global";
}

function inferAccountSegment(domain: string, fsiSubsector: string | undefined): string {
  const normalized = normalizeDomain(domain);
  if (!normalized) {
    return "Enterprise";
  }
  const exact = segmentByDomain[normalized];
  if (exact) {
    return exact;
  }
  if (strategicEnterpriseDomains.has(normalized)) {
    return "Strategic Enterprise";
  }
  if (fsiSubsector && ["AML/KYC", "Core Banking", "Fraud/Risk", "Regtech"].includes(fsiSubsector)) {
    return "FSI Infrastructure";
  }
  if (fsiSubsector && ["Lending/Mortgage", "Wealth/RIA"].includes(fsiSubsector)) {
    return "Commercial / Mid-Market";
  }
  return "Enterprise";
}

export function normalizeWebsetItem(
  item: unknown,
  options: {
    websetId?: string;
    enrichmentFieldById?: Record<string, string>;
    searchLaneById?: Record<string, SignalLane>;
  } = {},
): SignalRecord {
  const fields = new Map<string, string>();
  collectFields(item, fields);
  const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  addEnrichmentResults(raw, fields, options.enrichmentFieldById);

  const sourceUrl =
    readField(fields, ["source_url", "url", "result_url", "canonical_url", "properties_url"]) ??
    stringifyValue(raw.url);
  const sourceDomain = readField(fields, ["source_domain", "domain"]) ?? domainFromUrl(sourceUrl);
  const sourceType = readField(fields, ["source_type", "sourceType", "source_group"]) ?? "public_web";
  const sourceQuality = normalizeSourceQuality(readField(fields, ["source_quality", "reliability", "quality"]), sourceType);
  let companyDomain =
    normalizeDomain(readField(fields, ["company_domain", "account_domain", "domain_of_company"])) ||
    normalizeDomain(readField(fields, ["company", "account"])?.split(" ").at(-1)) ||
    normalizeDomain(sourceDomain);
  let accountName =
    readField(fields, ["account_name", "company_name", "account_guess", "organization", "entity", "company"]) ??
    companyDomain.split(".")[0] ??
    "Unknown Account";
  const alias = officialDomainAlias(companyDomain) ?? officialDomainAlias(sourceDomain);
  if (alias) {
    companyDomain = alias.domain;
    if (["careers", "jobs", "newsroom", "investor", "corporate", companyDomain.split(".")[0]].includes(accountName.toLowerCase())) {
      accountName = alias.accountName;
    }
  }
  const collapsedOfficialDomain = collapseOfficialSubdomain(companyDomain) ?? collapseOfficialSubdomain(sourceDomain);
  if (!alias && collapsedOfficialDomain) {
    companyDomain = collapsedOfficialDomain;
    if (["careers", "career", "jobs", "job", "newsroom", "investor", "investors", "ir", "corporate"].includes(accountName.toLowerCase())) {
      accountName = humanizeDomainAccount(collapsedOfficialDomain);
    }
  }
  const sourceId = stringifyValue(raw.sourceId);
  const lane =
    (sourceId ? options.searchLaneById?.[sourceId] : undefined) ??
    normalizeSignalLane(readField(fields, ["signal_lane", "lane", "signal_type", "classification", "tags"]));
  const discoveredAt = readField(fields, ["discovered_at", "created_at", "updated_at"]) ?? new Date().toISOString();
  const evidenceSummary =
    readField(fields, ["evidence_summary", "summary", "description", "properties_description", "custom_description", "reasoning", "explanation"]) ??
    "Source-backed signal found by Exa Websets.";
  const sourceTitle = readField(fields, ["source_title", "title", "title_or_actor", "properties_custom_title", "custom_title"]);
  const signalType = readField(fields, ["signal_type", "classification"]) ?? lane;
  const fsiSubsector = readField(fields, ["fsi_subsector", "subsector"]);
  const confidenceReason =
    readField(fields, ["confidence_reason", "reliability", "source_quality"]) ??
    (sourceQuality === "official" ? "Official or primary source." : undefined);
  const confidence = normalizeConfidence(readField(fields, ["confidence", "reliability", "source_quality"]), sourceQuality);

  return signalRecordSchema.parse({
    id: `sig_${stableId([options.websetId, stringifyValue(raw.id), sourceUrl, companyDomain, signalType])}`,
    websetId: options.websetId,
    websetItemId: stringifyValue(raw.id) ?? readField(fields, ["webset_item_id", "item_id"]),
    searchId: readField(fields, ["search_id"]) ?? sourceId,
    monitorId: readField(fields, ["monitor_id"]),
    accountName,
    companyDomain: companyDomain || "unknown.local",
    accountSegment: readField(fields, ["account_segment", "segment"]) ?? inferAccountSegment(companyDomain, fsiSubsector),
    territory: readField(fields, ["territory", "region", "geo"]) ?? inferTerritory(companyDomain),
    fsiSubsector,
    lane,
    signalType,
    sourceType,
    sourceQuality,
    sourceUrl,
    sourceTitle,
    sourceDomain,
    sourceDate: normalizeSourceDate(readField(fields, ["source_date", "date", "published_at", "published"])),
    discoveredAt,
    evidenceSummary,
    evidenceSnippet: readField(fields, ["evidence_snippet", "evidence", "snippet", "text"]),
    confidence,
    confidenceReason,
    workflow: readField(fields, ["workflow", "fsi_workflow", "use_case"]),
    agentAdoptionStage: readField(fields, ["agent_adoption_stage", "adoption_stage", "stage"]),
    whyExaMatters: readField(fields, ["why_exa_matters", "exa_value", "why_exa"]),
    suggestedDemoOptions: parseTags(readField(fields, ["suggested_demo_options", "demo_options"])),
    buyerPersonas: parseTags(readField(fields, ["buyer_personas", "personas", "buyers"])),
    tags: parseTags(readField(fields, ["tags"])),
    raw,
  });
}

export function laneFromSearchQuery(query: string | undefined): SignalLane {
  if (!query) {
    return "unknown";
  }
  const exact = signalLanes.find((lane) => lane.defaultSearch === query);
  return exact?.id ?? normalizeSignalLane(query);
}

export function normalizeWebsetItems(
  items: unknown[],
  options: {
    websetId?: string;
    enrichmentFieldById?: Record<string, string>;
    searchLaneById?: Record<string, SignalLane>;
  } = {},
): SignalRecord[] {
  const seen = new Map<string, SignalRecord>();
  for (const item of items) {
    const signal = normalizeWebsetItem(item, options);
    seen.set(signal.id, signal);
  }
  return Array.from(seen.values());
}
