import { searchAmadeus } from "./amadeus";
import { searchKiwi } from "./kiwi";
import { searchSkyscanner } from "./skyscanner";
import type { AdapterResult } from "./types";
import { expandDatePairs } from "../dates";
import { buildTripOptions } from "../deep-links";
import {
  buildSourceStatuses,
  getKeyPresence,
  hasAmadeusKeys,
  hasKiwiKey,
  hasSkyscannerKey,
} from "../sources";
import { normalizeStayDays } from "../stays";
import type { FlightOffer, SearchRequest, SearchResponse } from "../types";

const MODE_RANK: Record<FlightOffer["mode"], number> = {
  live: 0,
  demo: 1,
  "link-out": 2,
};

export function sortOffers(a: FlightOffer, b: FlightOffer): number {
  const modeDiff = MODE_RANK[a.mode] - MODE_RANK[b.mode];
  if (modeDiff !== 0) return modeDiff;
  const aPriced = a.price != null;
  const bPriced = b.price != null;
  if (aPriced && !bPriced) return -1;
  if (!aPriced && bPriced) return 1;
  if (aPriced && bPriced && a.price !== b.price) {
    return (a.price as number) - (b.price as number);
  }
  return a.sourcePriority - b.sourcePriority;
}

function anyOptionalLiveKey(): boolean {
  return hasSkyscannerKey() || hasKiwiKey() || hasAmadeusKeys();
}

/**
 * Ücretsiz yol (varsayılan): tüm geçerli tarih çiftleri + 19 kaynak deep-link.
 * Ücretli API anahtarı yok / istenmiyor — scraping yok.
 * Anahtar varsa isteğe bağlı canlı fiyatlar eklenir (zorunlu değil).
 */
export async function runSearch(
  req: SearchRequest
): Promise<SearchResponse> {
  const origin = req.origin.toUpperCase().trim();
  const destination = req.destination.toUpperCase().trim();
  const stayDays = normalizeStayDays(req.stayDays);

  const { pairs, total, sampled } = expandDatePairs(
    req.startDate,
    req.endDate,
    stayDays,
    150
  );

  const sources = buildSourceStatuses(false).map((s) => ({
    ...s,
    mode: "link-out" as const,
    note:
      s.priority === 1
        ? "Ücretsiz deep-link (Skyscanner TR) — birincil satın alma yolu"
        : s.note.startsWith("Resmi") || s.note.includes("deep-link")
          ? s.note
          : `${s.name} deep-link (ücretsiz yol)`,
  }));

  if (!pairs.length) {
    return {
      tripOptions: [],
      tripOptionsTotal: 0,
      tripOptionsSampled: false,
      offers: [],
      sources,
      datePairsSearched: 0,
      freePath: true,
      demo: false,
      keys: getKeyPresence(),
      adapters: [],
      message:
        "Geçerli tarih çifti bulunamadı. Tarih aralığını veya konaklama süresini (2–21 gün) kontrol edin.",
    };
  }

  const tripOptions = buildTripOptions(origin, destination, pairs);

  // İsteğe bağlı: kullanıcı ücretli anahtar eklediyse canlı fiyat dene (zorunlu değil)
  let offers: FlightOffer[] = [];
  let adapters: AdapterResult[] = [];
  let freePath = true;
  let message =
    `Ücretsiz yol: ${total} tarih çifti üretildi` +
    (sampled ? ` (gösterilen ${pairs.length}, eşit aralıklı örnek)` : "") +
    `. Her çift için 19 kaynak linki — Skyscanner birinci. Gerçek fiyat kaynak sitesinde; ücretli API yok.`;

  if (anyOptionalLiveKey()) {
    freePath = false;
    const [sky, kiwi, amadeus] = await Promise.all([
      searchSkyscanner(origin, destination, pairs.slice(0, 6)),
      searchKiwi(origin, destination, pairs.slice(0, 6)),
      searchAmadeus(origin, destination, pairs.slice(0, 6)),
    ]);
    adapters = [sky, kiwi, amadeus];
    offers = [...sky.offers, ...kiwi.offers, ...amadeus.offers].sort(
      sortOffers
    );

    // Canlı fiyatları trip option’lara bağla (eşleşen tarih)
    const priceByKey = new Map<string, number>();
    for (const o of offers) {
      if (o.price == null) continue;
      const dep = o.outbound.departure.slice(0, 10);
      const ret = o.inbound.departure.slice(0, 10);
      const key = `${dep}|${ret}|${o.stayDays}`;
      const prev = priceByKey.get(key);
      if (prev == null || o.price < prev) priceByKey.set(key, o.price);
    }
    for (const t of tripOptions) {
      const p = priceByKey.get(
        `${t.departure}|${t.returnDate}|${t.stayDays}`
      );
      if (p != null) t.price = p;
    }
    tripOptions.sort((a, b) => {
      if (a.price != null && b.price != null && a.price !== b.price) {
        return a.price - b.price;
      }
      if (a.price != null && b.price == null) return -1;
      if (a.price == null && b.price != null) return 1;
      return a.departure.localeCompare(b.departure);
    });

    message =
      offers.length > 0
        ? `Canlı fiyat sinyali bulundu (${offers.length}); en ucuz tarih çiftleri üstte. Diğerleri deep-link.`
        : message + " (İsteğe bağlı API anahtarları yanıt vermedi — deep-link devam.)";
  } else {
    // Fiyatsız: kronolojik sıra (zaten expand sıralı)
    tripOptions.sort((a, b) => {
      if (a.departure !== b.departure) {
        return a.departure.localeCompare(b.departure);
      }
      return a.stayDays - b.stayDays;
    });
  }

  return {
    tripOptions,
    tripOptionsTotal: total,
    tripOptionsSampled: sampled,
    offers,
    sources,
    datePairsSearched: pairs.length,
    freePath,
    demo: false,
    keys: getKeyPresence(),
    adapters: adapters.map((a) => ({
      source: a.source,
      ok: a.ok,
      count: a.offers.length,
      error: a.error,
      meta: a.meta,
    })),
    message,
  };
}
