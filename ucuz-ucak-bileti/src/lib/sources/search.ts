import { airportStats } from "../airports";
import { generateDatePairs } from "../dates";
import type { Offer, SearchRequest, SearchResponse, SourceReport } from "../types";
import {
  AIRLINES,
  buildAirlineReport,
  probeAirlineDirect,
} from "./airlines";
import { ENUYGUN_SOURCE, searchEnuygunRoundTrip } from "./enuygun";
import { SOURCE_REGISTRY } from "./registry";
import { searchSkyscannerRoundTrip } from "./skyscanner";

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

async function probeOta(url: string): Promise<{
  ok: boolean;
  detail: string;
}> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UcuzUcakBileti/0.2)",
        Accept: "text/html",
      },
    });
    clearTimeout(t);
    const text = await res.text();
    const head = text.slice(0, 1500).toLowerCase();
    if (head.includes("access denied") || res.status === 403) {
      return { ok: false, detail: `HTTP ${res.status} Access Denied / 403` };
    }
    if (head.includes("just a moment") || head.includes("captcha")) {
      return { ok: false, detail: `HTTP ${res.status} CAPTCHA/challenge` };
    }
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    return { ok: true, detail: `HTTP ${res.status} sayfa açıldı; fiyat API yok` };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function runSearch(req: SearchRequest): Promise<SearchResponse> {
  const pairs = generateDatePairs({
    earliest: req.earliest,
    latest: req.latest,
    minStayDays: req.minStayDays,
    maxStayDays: req.maxStayDays,
    maxPairs: req.maxDatePairs ?? 2,
  });

  const errors: SearchResponse["errors"] = [];
  const offers: Offer[] = [];
  let enuygunWorking = false;
  let enuygunTestedAt: string | undefined;
  let enuygunRoute: string | undefined;
  const airlineOfferCounts = new Map<string, number>();
  const carriersSeen = new Set<string>();

  const first = pairs[0];
  let skyscannerReport: SourceReport | undefined;
  if (first) {
    const sky = await searchSkyscannerRoundTrip({
      originCode: req.origin,
      destinationCode: req.destination,
      departIso: first.depart,
      returnIso: first.return,
      adults: req.adults ?? 1,
    });
    skyscannerReport = sky.report;
    if (sky.offers.length) offers.push(...sky.offers);
    if (sky.error) {
      errors.push({ sourceId: "skyscanner", message: sky.error });
    }
  }

  // Direct airline probes (parallel, no price scrape)
  const directProbes = await Promise.all(
    AIRLINES.map(async (a) => ({ airline: a, direct: await probeAirlineDirect(a) })),
  );

  const pairResults = await mapPool(pairs, 2, async (pair) => {
    try {
      const found = await searchEnuygunRoundTrip({
        originCode: req.origin,
        destinationCode: req.destination,
        departIso: pair.depart,
        returnIso: pair.return,
        adults: req.adults ?? 1,
        topCombosPerPair: 4,
        airlinePurePerCarrier: 2,
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
      for (const c of r.found.carriersSeen) carriersSeen.add(c);
      if (r.found.offers.length || r.found.airlineOffers.length) {
        enuygunWorking = true;
        enuygunTestedAt = new Date().toISOString();
        enuygunRoute = `${req.origin}→${req.destination} ${r.pair.depart}–${r.pair.return}`;
        offers.push(...r.found.offers);
        for (const ao of r.found.airlineOffers) {
          offers.push(ao);
          airlineOfferCounts.set(
            ao.sourceId,
            (airlineOfferCounts.get(ao.sourceId) || 0) + 1,
          );
        }
      }
    } else {
      errors.push({
        sourceId: "enuygun",
        message: `${r.pair.depart}–${r.pair.return}: ${r.message}`,
      });
    }
  }

  // Quick OTA / meta probes (page reachability only — no scrape)
  const [turnaProbe, obiletProbe, googleProbe, kayakProbe] = await Promise.all([
    probeOta("https://www.turna.com/ucak-bileti"),
    probeOta("https://www.obilet.com/ucak-bileti"),
    probeOta("https://www.google.com/travel/flights"),
    probeOta("https://www.kayak.com.tr/flights"),
  ]);

  const dedup = new Map<string, Offer>();
  for (const o of offers) {
    const key = [
      o.sourceId,
      o.outbound.flightNumber,
      o.inbound.flightNumber,
      o.outbound.departAt,
      o.inbound.departAt,
      o.totalPriceTry,
    ].join("|");
    const prev = dedup.get(key);
    if (!prev || o.totalPriceTry < prev.totalPriceTry) dedup.set(key, o);
  }

  const sorted = [...dedup.values()].sort(
    (a, b) => a.totalPriceTry - b.totalPriceTry,
  );

  const stats = airportStats();
  const routeNote = enuygunRoute || (first ? `${req.origin}→${req.destination}` : undefined);

  const airlineReports = directProbes.map(({ airline, direct }) =>
    buildAirlineReport({
      airline,
      direct,
      viaEnuygunOffers: airlineOfferCounts.get(airline.id) || 0,
      lastTestRoute: routeNote,
      extraLimitations:
        airline.iata && carriersSeen.has(airline.iata) && !airlineOfferCounts.get(airline.id)
          ? [
              `ENUYGUN meta listesinde ${airline.iata} geçti ancak dönen top sonuçlarda saf ${airline.iata}+${airline.iata} RT yoktu.`,
            ]
          : [],
    }),
  );

  const sources: SourceReport[] = SOURCE_REGISTRY.map((s) => {
    if (s.id === "enuygun") {
      return {
        ...ENUYGUN_SOURCE,
        status: enuygunWorking
          ? "working"
          : errors.some((e) => e.sourceId === "enuygun")
            ? "partial"
            : ENUYGUN_SOURCE.status,
        realPriceVerified: enuygunWorking,
        lastTestedAt: enuygunTestedAt ?? s.lastTestedAt,
        lastTestRoute: enuygunRoute ?? s.lastTestRoute,
      };
    }
    if (s.id === "skyscanner" && skyscannerReport) return skyscannerReport;
    const ar = airlineReports.find((x) => x.id === s.id);
    if (ar) return ar;
    if (s.id === "turna") {
      return {
        ...s,
        status: turnaProbe.ok ? "partial" : "inaccessible",
        realPriceVerified: false,
        lastTestedAt: new Date().toISOString(),
        limitations: [
          turnaProbe.detail,
          "Doğrulanmış fiyat API’si bulunamadı; link-only tamamlanmış sayılmaz.",
        ],
      };
    }
    if (s.id === "obilet") {
      return {
        ...s,
        status: obiletProbe.ok ? "partial" : "inaccessible",
        realPriceVerified: false,
        lastTestedAt: new Date().toISOString(),
        limitations: [
          obiletProbe.detail,
          "Ana sayfa erişilebilir; ücretsiz fiyat okuma API’si doğrulanamadı (link-only ≠ done).",
        ],
      };
    }
    if (s.id === "google-flights") {
      return {
        ...s,
        status: "inaccessible",
        realPriceVerified: false,
        lastTestedAt: new Date().toISOString(),
        limitations: [
          googleProbe.detail,
          "Sayfa açılabilir; ücretsiz doğrulanmış booking fiyat API’si yok (scrape/CAPTCHA yok).",
          "Takvim tahmini ≠ doğrulanmış rezervasyon fiyatı.",
        ],
      };
    }
    if (s.id === "kayak") {
      return {
        ...s,
        status: "inaccessible",
        realPriceVerified: false,
        lastTestedAt: new Date().toISOString(),
        limitations: [
          kayakProbe.detail,
          "Kayak.com.tr sayfa açılır; partner/ToS dışı otomatik fiyat okuma yok.",
          "Link-only / scrape tamamlanmış sayılmaz.",
        ],
      };
    }
    return s;
  });

  // Ensure airline reports appear even if registry order differs
  for (const ar of airlineReports) {
    if (!sources.some((s) => s.id === ar.id)) sources.push(ar);
  }

  return {
    offers: sorted,
    sources,
    searchedPairs: pairs.map((p) => ({ depart: p.depart, return: p.return })),
    meta: {
      generatedAt: new Date().toISOString(),
      note:
        "Doğrulanmış RT toplam fiyatına göre ucuz→pahalı. Havayolu satırları “Havayolu · ENUYGUN” ise doğrudan NDC değil, ENUYGUN RT aramasından saf taşıyıcı kombinasyonudur. THY için iki ayrı OW toplanmaz. Uydurma fiyat yok.",
      airportCount: stats.airportCount,
      cityGroupCount: stats.cityGroupCount,
    },
    errors,
  };
}
