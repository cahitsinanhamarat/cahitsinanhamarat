import { generateDatePairs } from "../dates";
import type { Offer, SearchRequest, SearchResponse, SourceReport } from "../types";
import { ENUYGUN_SOURCE, searchEnuygunRoundTrip } from "./enuygun";
import { SOURCE_REGISTRY } from "./registry";

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export async function runSearch(req: SearchRequest): Promise<SearchResponse> {
  const pairs = generateDatePairs({
    earliest: req.earliest,
    latest: req.latest,
    minStayDays: req.minStayDays,
    maxStayDays: req.maxStayDays,
    maxPairs: req.maxDatePairs ?? 6,
  });

  const errors: SearchResponse["errors"] = [];
  const offers: Offer[] = [];
  let enuygunWorking = false;
  let enuygunTestedAt: string | undefined;
  let enuygunRoute: string | undefined;

  const pairResults = await mapPool(pairs, 2, async (pair) => {
    try {
      const { offers: found } = await searchEnuygunRoundTrip({
        originCode: req.origin,
        destinationCode: req.destination,
        departIso: pair.depart,
        returnIso: pair.return,
        adults: req.adults ?? 1,
        topCombosPerPair: 3,
      });
      return { ok: true as const, found, pair };
    } catch (e) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : String(e),
        pair,
      };
    }
  });

  for (const r of pairResults) {
    if (r.ok) {
      if (r.found.length) {
        enuygunWorking = true;
        enuygunTestedAt = new Date().toISOString();
        enuygunRoute = `${req.origin}→${req.destination} ${r.pair.depart}–${r.pair.return}`;
        offers.push(...r.found);
      }
    } else {
      errors.push({
        sourceId: "enuygun",
        message: `${r.pair.depart}–${r.pair.return}: ${r.message}`,
      });
    }
  }

  // Deduplicate by flight numbers + dates + price
  const dedup = new Map<string, Offer>();
  for (const o of offers) {
    const key = [
      o.outbound.flightNumber,
      o.inbound.flightNumber,
      o.outbound.departAt,
      o.inbound.departAt,
      o.totalPriceTry,
    ].join("|");
    const prev = dedup.get(key);
    if (!prev || o.totalPriceTry < prev.totalPriceTry) dedup.set(key, o);
  }

  const sorted = [...dedup.values()].sort((a, b) => {
    // Standard public totals first; conditional-discount rows still sorted by
    // their reported total but never invent a lower "promo" sort key.
    return a.totalPriceTry - b.totalPriceTry;
  });

  const sources: SourceReport[] = SOURCE_REGISTRY.map((s) => {
    if (s.id !== "enuygun") return s;
    return {
      ...ENUYGUN_SOURCE,
      status: enuygunWorking
        ? "working"
        : errors.length
          ? "partial"
          : ENUYGUN_SOURCE.status,
      realPriceVerified: enuygunWorking,
      lastTestedAt: enuygunTestedAt ?? s.lastTestedAt,
      lastTestRoute: enuygunRoute ?? s.lastTestRoute,
    };
  });

  return {
    offers: sorted,
    sources,
    searchedPairs: pairs.map((p) => ({ depart: p.depart, return: p.return })),
    meta: {
      generatedAt: new Date().toISOString(),
      note:
        "Sonuçlar doğrulanmış gidiş-dönüş toplam fiyatına göre ucuz→pahalı sıralıdır. Kaynak önceliği yalnızca araştırma sırasıdır. Uydurma fiyat yok.",
    },
    errors,
  };
}
