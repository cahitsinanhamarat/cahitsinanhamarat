import { searchAmadeus } from "./amadeus";
import { searchKiwi } from "./kiwi";
import { buildDemoOffers } from "./mock";
import { searchSkyscanner } from "./skyscanner";
import type { AdapterResult } from "./types";
import { expandDatePairs, type DatePair } from "../dates";
import { buildLinkOutOffers } from "../deep-links";
import {
  buildSourceStatuses,
  forceDemo,
  getKeyPresence,
  hasAmadeusKeys,
  hasKiwiKey,
  hasSkyscannerKey,
} from "../sources";
import type { FlightOffer, SearchRequest, SearchResponse } from "../types";

const MODE_RANK: Record<FlightOffer["mode"], number> = {
  live: 0,
  demo: 1,
  "link-out": 2,
};

/** Canlı fiyatlar önce; sonra ucuzdan pahalıya; eşitlikte Skyscanner önceliği. */
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
  // Eşit fiyat / ikisi de null: Skyscanner (#1) öne
  return a.sourcePriority - b.sourcePriority;
}

function pickRepresentativePair(pairs: DatePair[]): DatePair {
  return pairs[Math.floor(pairs.length / 2)] ?? pairs[0];
}

function anyLiveKey(): boolean {
  return hasSkyscannerKey() || hasKiwiKey() || hasAmadeusKeys();
}

export async function runSearch(
  req: SearchRequest
): Promise<SearchResponse> {
  const origin = req.origin.toUpperCase().trim();
  const destination = req.destination.toUpperCase().trim();
  const stayDays = req.stayDays.length ? req.stayDays : [3, 4];

  const pairs = expandDatePairs(req.startDate, req.endDate, stayDays, 40);

  if (!pairs.length) {
    return {
      offers: [],
      sources: buildSourceStatuses(false),
      datePairsSearched: 0,
      demo: false,
      keys: getKeyPresence(),
      adapters: [],
      message:
        "Geçerli tarih çifti bulunamadı. Tarih aralığını veya konaklama süresini kontrol edin.",
    };
  }

  const demoForced = forceDemo();
  const useDemoFallback = demoForced || !anyLiveKey();

  if (useDemoFallback) {
    const demoOffers = buildDemoOffers(origin, destination, pairs);
    const linkOuts = buildLinkOutOffers(
      origin,
      destination,
      pickRepresentativePair(pairs),
      "demo"
    ).filter(
      (o) =>
        !["Skyscanner", "Kiwi.com", "Enuygun", "Kayak"].includes(o.source)
    );

    const offers = [...demoOffers, ...linkOuts].sort(sortOffers);
    return {
      offers,
      sources: buildSourceStatuses(true),
      datePairsSearched: pairs.length,
      demo: true,
      keys: getKeyPresence(),
      adapters: [],
      message: demoForced
        ? "DEMO_MODE=force — örnek fiyatlar. Canlı API için DEMO_MODE’u kaldırıp anahtar ekleyin."
        : "Demo modu: API anahtarı yok. Örnek fiyatlar + deep-link’ler. Canlı fiyat için AMADEUS_*, KIWI_API_KEY veya SKYSCANNER_RAPIDAPI_KEY ekleyin (.env.local).",
    };
  }

  const [sky, kiwi, amadeus] = await Promise.all([
    searchSkyscanner(origin, destination, pairs),
    searchKiwi(origin, destination, pairs),
    searchAmadeus(origin, destination, pairs),
  ]);

  const adapters: AdapterResult[] = [sky, kiwi, amadeus];
  const liveOffers = [...sky.offers, ...kiwi.offers, ...amadeus.offers];

  const linkOuts = buildLinkOutOffers(
    origin,
    destination,
    pickRepresentativePair(pairs),
    "link-out"
  ).filter((o) => {
    if (o.source === "Skyscanner" && sky.offers.length) return false;
    if (o.source === "Kiwi.com" && kiwi.offers.length) return false;
    return true;
  });

  const offers = [...liveOffers, ...linkOuts].sort(sortOffers);

  const liveCount = liveOffers.filter((o) => o.price != null).length;
  const parts: string[] = [];
  if (sky.offers.length) parts.push(`Skyscanner ${sky.offers.length}`);
  if (kiwi.offers.length) parts.push(`Kiwi ${kiwi.offers.length}`);
  if (amadeus.offers.length) parts.push(`Amadeus ${amadeus.offers.length}`);

  const failNotes = adapters
    .filter((a) => a.error && !a.offers.length)
    .map((a) => `${a.source}: ${a.error}`)
    .slice(0, 3);

  let message: string | undefined;
  if (liveCount) {
    message = `Canlı sonuçlar: ${parts.join(", ")}.${
      failNotes.length ? ` Uyarılar: ${failNotes.join(" | ")}` : ""
    }`;
  } else {
    message = `Canlı API yanıt vermedi (${failNotes.join(" | ") || "boş"}). Onaylı kaynaklara deep-link listeleniyor.`;
  }

  return {
    offers,
    sources: buildSourceStatuses(false),
    datePairsSearched: pairs.length,
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
