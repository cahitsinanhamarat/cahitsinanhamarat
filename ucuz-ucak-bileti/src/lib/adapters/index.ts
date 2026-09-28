import { searchAmadeus } from "./amadeus";
import { searchKiwi } from "./kiwi";
import { buildDemoOffers } from "./mock";
import { searchSkyscanner } from "./skyscanner";
import { expandDatePairs, type DatePair } from "../dates";
import { buildLinkOutOffers } from "../deep-links";
import {
  buildSourceStatuses,
  forceDemo,
  hasAmadeusKeys,
  hasKiwiKey,
  hasSkyscannerKey,
} from "../sources";
import type { FlightOffer, SearchRequest, SearchResponse } from "../types";

function sortOffers(a: FlightOffer, b: FlightOffer): number {
  const aPriced = a.price != null;
  const bPriced = b.price != null;
  if (aPriced && !bPriced) return -1;
  if (!aPriced && bPriced) return 1;
  if (aPriced && bPriced && a.price !== b.price) {
    return (a.price as number) - (b.price as number);
  }
  return a.sourcePriority - b.sourcePriority;
}

function pickRepresentativePair(pairs: DatePair[]): DatePair {
  // Orta nokta — deep-link’ler için tipik tarih
  return pairs[Math.floor(pairs.length / 2)] ?? pairs[0];
}

export async function runSearch(
  req: SearchRequest
): Promise<SearchResponse> {
  const origin = req.origin.toUpperCase().trim();
  const destination = req.destination.toUpperCase().trim();
  const stayDays = req.stayDays.length ? req.stayDays : [3, 4];

  const pairs = expandDatePairs(
    req.startDate,
    req.endDate,
    stayDays,
    40
  );

  if (!pairs.length) {
    return {
      offers: [],
      sources: buildSourceStatuses(false),
      datePairsSearched: 0,
      demo: false,
      message:
        "Geçerli tarih çifti bulunamadı. Tarih aralığını veya konaklama süresini kontrol edin.",
    };
  }

  const demo =
    forceDemo() ||
    (!hasSkyscannerKey() && !hasKiwiKey() && !hasAmadeusKeys());

  if (demo) {
    const demoOffers = buildDemoOffers(origin, destination, pairs);
    const linkOuts = buildLinkOutOffers(
      origin,
      destination,
      pickRepresentativePair(pairs),
      "demo"
    ).filter((o) => !["Skyscanner", "Kiwi.com", "Enuygun", "Kayak"].includes(o.source));

    const offers = [...demoOffers, ...linkOuts].sort(sortOffers);
    return {
      offers,
      sources: buildSourceStatuses(true),
      datePairsSearched: pairs.length,
      demo: true,
      message:
        "Demo modu: API anahtarı yok. Örnek fiyatlar gösteriliyor; tüm kaynaklara deep-link ile gidebilirsiniz. Canlı fiyat için .env dosyasına anahtar ekleyin.",
    };
  }

  const [sky, kiwi, amadeus] = await Promise.all([
    searchSkyscanner(origin, destination, pairs),
    searchKiwi(origin, destination, pairs),
    searchAmadeus(origin, destination, pairs),
  ]);

  const liveIds = new Set(
    [...sky, ...kiwi].map((o) => o.source.toLowerCase())
  );

  const linkOuts = buildLinkOutOffers(
    origin,
    destination,
    pickRepresentativePair(pairs),
    "link-out"
  ).filter((o) => {
    // Canlı sonuç dönen kaynaklar için tekrar link-out ekleme
    if (o.source === "Skyscanner" && sky.length) return false;
    if (o.source === "Kiwi.com" && kiwi.length) return false;
    return true;
  });

  void liveIds;

  const offers = [...sky, ...kiwi, ...amadeus, ...linkOuts].sort(sortOffers);

  return {
    offers,
    sources: buildSourceStatuses(false),
    datePairsSearched: pairs.length,
    demo: false,
    message:
      sky.length || kiwi.length || amadeus.length
        ? undefined
        : "Canlı API yanıt vermedi; onaylı kaynaklara deep-link sonuçları listeleniyor.",
  };
}
