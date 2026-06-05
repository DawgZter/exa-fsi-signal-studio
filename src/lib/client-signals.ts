import type { ClientSignal } from "./types";
import type { SignalRecord } from "./domain";

export function toClientSignal<T extends SignalRecord>(signal: T): Omit<T, "raw" | "websetId" | "websetItemId" | "searchId" | "monitorId"> {
  const { raw, websetId, websetItemId, searchId, monitorId, ...clientSignal } = signal;
  void raw;
  void websetId;
  void websetItemId;
  void searchId;
  void monitorId;
  return clientSignal;
}

export function toClientSignals(signals: SignalRecord[]): ClientSignal[] {
  return signals.map((signal) => toClientSignal(signal) as ClientSignal);
}
