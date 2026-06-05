import { getOptionalEnv } from "./env";

export function normalizeDomain(domain: string | undefined): string {
  if (!domain) {
    return "";
  }
  return domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0]
    .toLowerCase();
}

export function domainFromUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return undefined;
  }
}

export function prospectLogoUrl(domain: string | undefined): string | undefined {
  const normalized = normalizeDomain(domain);
  if (!normalized) {
    return undefined;
  }

  const provider = (getOptionalEnv("LOGO_PROVIDER") ?? "favicon").toLowerCase();
  if (provider === "none") {
    return undefined;
  }
  if (provider === "clearbit") {
    return `https://logo.clearbit.com/${normalized}`;
  }
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(normalized)}&sz=128`;
}

