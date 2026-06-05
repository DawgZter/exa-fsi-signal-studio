import { config } from "dotenv";
import { buildAccounts, signalFacets } from "../src/lib/accounts";
import { reviewsForSignals, reviewStatusCounts } from "../src/lib/reviews";
import { getStoreDescription, readAccountSuggestions, readReviews, readSignals, readStudios, readSyncState } from "../src/lib/store";

config({ path: ".env.local" });

const signals = await readSignals();
const accounts = buildAccounts(signals);
const studios = await readStudios();
const reviews = await readReviews();
const accountSuggestions = await readAccountSuggestions();
const sync = await readSyncState();

console.log(
  JSON.stringify(
    {
      store: getStoreDescription(),
      sync,
      counts: {
        signals: signals.length,
        accounts: accounts.length,
        studios: studios.length,
        reviews: reviews.length,
        accountSuggestions: accountSuggestions.length,
      },
      reviewStatus: reviewStatusCounts(reviewsForSignals(reviews, signals)),
      facets: signalFacets(signals),
      latestAccounts: accounts.slice(0, 10),
    },
    null,
    2,
  ),
);
