import { config } from "dotenv";
import { buildAccounts } from "../src/lib/accounts";
import { getOptionalEnv } from "../src/lib/env";
import { readReviews, readSignals, writeAccounts, writeReviews, writeSignals } from "../src/lib/store";
import { syncWebsetToStore } from "../src/lib/sync";
import { ExaWebsetsClient } from "../src/lib/websets";

config({ path: ".env.local" });

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function listArg(name: string): string[] {
  return (getArg(name) ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

const obviousNonFsiDomains = new Map<string, string>([
  ["10clouds.com", "consulting/vendor page, not a named FSI buyer"],
  ["163.com", "publisher/supplier page, not the FSI buyer"],
  ["acceleraid.ai", "AI/vendor solution listing, not a named FSI buyer"],
  ["actuary.info", "publisher/domain fallback, not target FSI account"],
  ["afr.com", "publisher/domain fallback, not target FSI account"],
  ["ai-cio.com", "publisher/domain fallback, not target FSI account"],
  ["amazon.com", "cloud provider page, not a named FSI buyer"],
  ["americanbanker.com", "publisher/domain fallback, not target FSI account"],
  ["anthemcreation.com", "publisher page, not the FSI buyer"],
  ["anthropic.com", "AI vendor page, not a named FSI buyer"],
  ["artefact.com", "consulting/vendor page, not target FSI account"],
  ["asahi.com", "publisher/domain fallback, not target FSI account"],
  ["asianmorningstandard.com", "publisher/domain fallback, not target FSI account"],
  ["atlastechnica.com", "IT services hiring page, not FSI operator"],
  ["axonflow.com", "AI/vendor documentation page, not a named FSI buyer"],
  ["baft.org", "association/event context, not a target account"],
  ["bidtrust.ai", "software project/vendor context, not FSI operator"],
  ["business-standard.com", "publisher/domain fallback, not target FSI account"],
  ["businesswire.com", "publisher/domain fallback, not target FSI account"],
  ["businesstimes.com.sg", "publisher/domain fallback, not target FSI account"],
  ["businesstoday.in", "publisher/domain fallback, not target FSI account"],
  ["caspio.com", "software vendor marketplace page"],
  ["cedogroup.com", "event/consulting context, not FSI operator"],
  ["cfotech.asia", "publisher/domain fallback, not target FSI account"],
  ["cfotech.co.uk", "publisher/domain fallback, not target FSI account"],
  ["channellife.news", "publisher/domain fallback, not target FSI account"],
  ["chatfin.ai", "finance automation vendor page, not a financial-services operator"],
  ["chatgptaihub.com", "publisher/blog page, not source account domain"],
  ["cnbc.com", "publisher/domain fallback, not target FSI account"],
  ["cnbctv18.com", "publisher/domain fallback, not target FSI account"],
  ["cmotech.uk", "publisher/domain fallback, not target FSI account"],
  ["cognizant.com", "consulting/vendor page, not a named FSI buyer"],
  ["crypto.news", "publisher/domain fallback, not target FSI account"],
  ["crowdfundinsider.com", "publisher/domain fallback, not target FSI account"],
  ["digitalmarketreports.com", "publisher/domain fallback, not target FSI account"],
  ["eclerx.com", "services/vendor page, not FSI operator"],
  ["economictimes.indiatimes.com", "publisher/domain fallback, not target FSI account"],
  ["en.sedaily.com", "publisher/domain fallback, not target FSI account"],
  ["fin.ai", "generic AI customer-service vendor page"],
  ["finance.yahoo.com", "publisher/domain fallback, not target FSI account"],
  ["financial-news.co.uk", "publisher/domain fallback, not target FSI account"],
  ["financial-planning.com", "publisher/domain fallback, not target FSI account"],
  ["financemagnates.com", "publisher/domain fallback, not target FSI account"],
  ["finextra.com", "publisher/domain fallback, not target FSI account"],
  ["fintechasia.ph", "publisher/domain fallback, not target FSI account"],
  ["fintechnews.ch", "publisher/domain fallback, not target FSI account"],
  ["finnate.ai", "lending AI vendor page, not a named lender"],
  ["fisent.com", "AI/vendor page, not named FSI buyer"],
  ["frontiernews.ai", "publisher/domain fallback, not target FSI account"],
  ["fushitech.com", "merchant AI vendor/press release, not FSI operator"],
  ["galvnews.com", "publisher/domain fallback, not target FSI account"],
  ["generalcatalyst.com", "venture capital portfolio/news page, not FSI operator signal"],
  ["getperspective.ai", "AI/vendor page, not named FSI buyer"],
  ["googlecloudpresscorner.com", "cloud provider publisher page, not target FSI account"],
  ["ibm.com", "technology vendor thought leadership"],
  ["insurtechny.com", "event/community page, not insurer account"],
  ["investmentnews.com", "publisher/domain fallback, not target FSI account"],
  ["intellectyx.com", "services/vendor page, not FSI operator"],
  ["intellias.com", "consulting/vendor hiring page"],
  ["kinfos.events", "event organizer page, not target account"],
  ["kay.ai", "insurance automation vendor page, not target broker account"],
  ["kiteworks.com", "software vendor thought leadership"],
  ["kore.ai", "AI vendor page, not a named FSI buyer"],
  ["koreatimes.co.kr", "publisher/domain fallback, not target FSI account"],
  ["kpmg.com", "consulting thought leadership without named FSI account"],
  ["lasvegassun.com", "publisher/domain fallback, not target FSI account"],
  ["linkedin.com", "social/profile page, not target account domain"],
  ["lumiq.ai", "AI vendor launch, not FSI operator"],
  ["marketscreener.com", "publisher/domain fallback, not target FSI account"],
  ["moneymarketing.co.uk", "publisher/domain fallback, not target FSI account"],
  ["multimodal.dev", "vendor blog/context page"],
  ["nationalmortgagenews.com", "publisher/domain fallback, not target FSI account"],
  ["nationalmortgageprofessional.com", "publisher/domain fallback, not target FSI account"],
  ["netcetera.com", "payments software vendor interview, not FSI operator"],
  ["neurons-lab.com", "AI vendor list/context page"],
  ["neyro.network", "DeFi AI vendor/context page"],
  ["newswire.ca", "publisher/domain fallback, not target FSI account"],
  ["onestream.com", "enterprise software vendor, not FSI operator"],
  ["openai.com", "AI vendor page, not target FSI account"],
  ["orbitfin.ai", "investment-research software vendor page, not asset manager/operator"],
  ["persistent.com", "consulting/vendor page, not a named FSI buyer"],
  ["prnewswire.com", "publisher/domain fallback, not target FSI account"],
  ["pymnts.com", "publisher/domain fallback, not target FSI account"],
  ["reinsurancene.ws", "publisher/domain fallback, not target FSI account"],
  ["samsungsds.com", "technology vendor page, not target FSI account"],
  ["scoopcloud.com", "publisher/domain fallback, not target FSI account"],
  ["scottishfinancialnews.com", "publisher/domain fallback, not target FSI account"],
  ["securitybrief.news", "publisher/domain fallback, not target FSI account"],
  ["send2press.com", "publisher/domain fallback, not target FSI account"],
  ["siliconreport.com", "publisher/domain fallback, not target FSI account"],
  ["stocktitan.net", "publisher/domain fallback, not target FSI account"],
  ["svrn.net", "generic AI governance vendor page"],
  ["sutherlandglobal.com", "BPO/vendor thought leadership"],
  ["t-systems.com", "government cloud supplier, not FSI operator"],
  ["thebusinessjournal.com", "publisher/domain fallback, not target FSI account"],
  ["thechainobserver.com", "publisher/domain fallback, not target FSI account"],
  ["thefinancedata.com", "publisher/domain fallback, not target FSI account"],
  ["thepaypers.com", "publisher/domain fallback, not target FSI account"],
  ["thomsonreuters.com", "publisher/event context, not target FSI account"],
  ["tinubu.com", "insurance software vendor whitepaper, not insurer account"],
  ["uptiq.ai", "wealth/banking AI vendor page, not a named FSI buyer"],
  ["veripark.com", "banking software vendor post, not a named FSI buyer"],
  ["workday.com", "HR/finance software vendor launch"],
  ["world.storm.mg", "publisher/domain fallback, not target FSI account"],
  ["worthai.com", "KYB/underwriting AI vendor hiring page"],
  ["yeahka.com", "merchant AI vendor/press release, not FSI operator"],
  ["youtube.com", "media platform page, not target FSI account"],
  ["zenml.io", "developer tooling page, not target FSI account"],
  ["zeb.co", "consulting/vendor page, not a named FSI buyer"],
  ["zucisystems.com", "implementation partner page, not FSI operator"],
]);

const apply = hasFlag("--apply");
const syncAfterDelete = !hasFlag("--no-sync");
const websetId = getArg("--webset-id") ?? getOptionalEnv("EXA_WEBSET_ID");
const extraDomains = listArg("--domain");
const onlyDomains = listArg("--only-domain");
const limit = Number(getArg("--limit") ?? "");
const reasons = new Map(obviousNonFsiDomains);
for (const domain of extraDomains) {
  reasons.set(domain, "manually requested domain prune");
}

if (!websetId) {
  throw new Error("Missing EXA_WEBSET_ID. Pass --webset-id or set it in .env.local.");
}

const signals = await readSignals();
const domainFilter = onlyDomains.length ? new Set(onlyDomains) : undefined;
const candidates = signals
  .filter((signal) => {
    const domain = signal.companyDomain.toLowerCase();
    return domainFilter ? domainFilter.has(domain) : reasons.has(domain);
  })
  .slice(0, Number.isFinite(limit) && limit > 0 ? limit : undefined);

const byItemId = new Map<string, { itemId: string; signalIds: string[]; accountName: string; companyDomain: string; reason: string }>();
for (const signal of candidates) {
  const itemId = signal.websetItemId ?? String(signal.raw?.id ?? "");
  if (!itemId) {
    continue;
  }
  const existing = byItemId.get(itemId);
  if (existing) {
    existing.signalIds.push(signal.id);
    continue;
  }
  byItemId.set(itemId, {
    itemId,
    signalIds: [signal.id],
    accountName: signal.accountName,
    companyDomain: signal.companyDomain,
    reason: reasons.get(signal.companyDomain.toLowerCase()) ?? "domain selected for prune",
  });
}

const planned = Array.from(byItemId.values()).sort((a, b) => a.companyDomain.localeCompare(b.companyDomain));
const byDomain = planned.reduce<Record<string, number>>((acc, item) => {
  acc[item.companyDomain] = (acc[item.companyDomain] ?? 0) + 1;
  return acc;
}, {});

if (!apply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        websetId,
        deleteItemCount: planned.length,
        byDomain,
        items: planned,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const client = new ExaWebsetsClient();
const deleted: typeof planned = [];
const failed: Array<(typeof planned)[number] & { error: string }> = [];
for (const item of planned) {
  try {
    await client.deleteWebsetItem(websetId, item.itemId);
    deleted.push(item);
  } catch (error) {
    failed.push({
      ...item,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

let resynced:
  | {
      signals: number;
      accounts: number;
      reviews: number;
    }
  | undefined;

if (syncAfterDelete) {
  await syncWebsetToStore({ websetId });
  const nextSignals = await readSignals();
  const nextSignalIds = new Set(nextSignals.map((signal) => signal.id));
  const nextReviews = (await readReviews()).filter((review) => nextSignalIds.has(review.signalId));
  await writeReviews(nextReviews);
  resynced = {
    signals: nextSignals.length,
    accounts: buildAccounts(nextSignals).length,
    reviews: nextReviews.length,
  };
} else {
  const deletedSignalIds = new Set(deleted.flatMap((item) => item.signalIds));
  const nextSignals = signals.filter((signal) => !deletedSignalIds.has(signal.id));
  await writeSignals(nextSignals);
  await writeAccounts(buildAccounts(nextSignals));
  await writeReviews((await readReviews()).filter((review) => !deletedSignalIds.has(review.signalId)));
}

console.log(
  JSON.stringify(
    {
      mode: "apply",
      websetId,
      deleted: deleted.length,
      failed,
      byDomain,
      resynced,
    },
    null,
    2,
  ),
);
