import { searchAmadeus } from "./amadeus";
import { searchKiwi } from "./kiwi";
import { searchSkyscanner } from "./skyscanner";
import type { AdapterResult } from "./types";
import { expandDatePairs } from "../dates";
import { buildResultRows, buildTripOptions } from "../deep-links";
import {
  buildSourceStatuses,
  getKeyPresence,
  hasAmadeusKeys,
  hasKiwiKey,
  hasSkyscannerKey,
} from "../sources";
import { normalizeStayDays } from "../stays";
import type {
  CheapestPerSource,
  FlightOffer,
  ResultRow,
  SearchRequest,
  SearchResponse,
} from "../types";

export function sortOffers(a: FlightOffer, b: FlightOffer): number {
  const aPriced = a.price != null;
  const bPriced = b.price != null;
  if (aPriced && !bPriced) return -1;
  if (!aPriced && bPriced) return 1;
  if (aPriced && bPriced && a.price !== b.price) {
    return (a.price as number) - (b.price as number);
  }
  return a.sourcePriority - b.sourcePriority;
}

/** Fiyatlı önce (ucuzdan pahalıya); sonra gidiş tarihi; sonra kaynak önceliği. */
export function sortResultRows(a: ResultRow, b: ResultRow): number {
  const aP = a.price != null;
  const bP = b.price != null;
  if (aP && !bP) return -1;
  if (!aP && bP) return 1;
  if (aP && bP && a.price !== b.price) {
    return (a.price as number) - (b.price as number);
  }
  if (a.outboundDate !== b.outboundDate) {
    return a.outboundDate.localeCompare(b.outboundDate);
  }
  if (a.returnDate !== b.returnDate) {
    return a.returnDate.localeCompare(b.returnDate);
  }
  if (a.stayDays !== b.stayDays) return a.stayDays - b.stayDays;
  return a.sourcePriority - b.sourcePriority;
}

function cheapestPerSource(rows: ResultRow[]): CheapestPerSource[] {
  const best = new Map<string, ResultRow>();
  for (const row of rows) {
    const prev = best.get(row.source);
    if (!prev) {
      best.set(row.source, row);
      continue;
    }
    // Fiyatlı kazanır; ikisi fiyatlıysa ucuz; ikisi fiyatsızsa daha erken gidiş
    const better = sortResultRows(row, prev) < 0;
    if (better) best.set(row.source, row);
  }
  return [...best.values()]
    .sort((a, b) => a.sourcePriority - b.sourcePriority)
    .map((r) => ({
      source: r.source,
      sourcePriority: r.sourcePriority,
      outboundDate: r.outboundDate,
      returnDate: r.returnDate,
      stayDays: r.stayDays,
      price: r.price,
      purchaseUrl: r.purchaseUrl,
    }));
}

function offerToRow(o: FlightOffer): ResultRow {
  const outboundDate = o.outbound.departure.slice(0, 10);
  const returnDate = o.inbound.departure.slice(0, 10);
  return {
    id: `live-${o.id}`,
    sourceId: o.source.toLowerCase().replace(/\s+/g, "-"),
    source: o.source,
    sourcePriority: o.sourcePriority,
    outboundDate,
    returnDate,
    stayDays: o.stayDays,
    price: o.price,
    currency: "TRY",
    purchaseUrl: o.purchaseUrl,
    mode: o.mode,
  };
}

function anyOptionalLiveKey(): boolean {
  return hasSkyscannerKey() || hasKiwiKey() || hasAmadeusKeys();
}

function emptyResponse(
  sources: SearchResponse["sources"],
  message: string
): SearchResponse {
  return {
    rows: [],
    rowsTotal: 0,
    cheapestPerSource: [],
    overallCheapest: null,
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
    message,
  };
}

/**
 * Ücretsiz yol: kaynak × tarih satırları (her satırın kendi gidiş/dönüş tarihi).
 * Fiyat uydurulmaz. İsteğe bağlı canlı teklifler kendi tarihleriyle eklenir.
 */
export async function runSearch(
  req: SearchRequest
): Promise<SearchResponse> {
  const origin = req.origin.toUpperCase().trim();
  const destination = req.destination.toUpperCase().trim();
  const stayDays = normalizeStayDays(req.stayDays);

  // ~60 çift × 19 kaynak ≈ 1140 satır — tablo için makul
  const { pairs, total, sampled } = expandDatePairs(
    req.startDate,
    req.endDate,
    stayDays,
    60
  );

  const sources = buildSourceStatuses(false).map((s) => ({
    ...s,
    mode: "link-out" as const,
    note:
      s.priority === 1
        ? "Ücretsiz deep-link (Skyscanner TR) — birincil satın alma yolu"
        : s.note.includes("deep-link")
          ? s.note
          : `${s.name} deep-link (ücretsiz yol)`,
  }));

  if (!pairs.length) {
    return emptyResponse(
      sources,
      "Geçerli tarih çifti bulunamadı. Tarih aralığını veya konaklama süresini (2–21 gün) kontrol edin."
    );
  }

  const tripOptions = buildTripOptions(origin, destination, pairs);
  let rows = buildResultRows(origin, destination, pairs);
  let offers: FlightOffer[] = [];
  let adapters: AdapterResult[] = [];
  let freePath = true;

  let message =
    `Ücretsiz yol: ${total} tarih çifti` +
    (sampled ? ` (tabloda ${pairs.length} örnek)` : "") +
    ` × 19 kaynak = ${rows.length} satır. Her satırda gidiş/dönüş tarihi görünür; fiyat ücretsiz API olmadan “Sitede gör”. Sahte fiyat yok.`;

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

    // Canlı teklifler KENDİ tarihleriyle ayrı satır olarak eklenir (paylaşılan tarih varsayılmaz)
    const liveRows = offers.map(offerToRow);
    rows = [...liveRows, ...rows];

    message =
      liveRows.length > 0
        ? `Canlı fiyatlı ${liveRows.length} satır (kaynakların kendi tarihleriyle) + deep-link satırları. Genel ve kaynak-başı en ucuz özet tablonun üstünde.`
        : message + " (İsteğe bağlı API yanıt vermedi — deep-link satırları.)";
  }

  rows.sort(sortResultRows);
  const perSource = cheapestPerSource(rows);
  const overallCheapest =
    rows.find((r) => r.price != null) ?? null;

  return {
    rows,
    rowsTotal: rows.length,
    cheapestPerSource: perSource,
    overallCheapest,
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
