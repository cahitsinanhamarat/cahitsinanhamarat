import { peekFreePrices, applyPreviewPrices } from "./free-prices";
import type { AdapterResult } from "./types";
import { expandDatePairs } from "../dates";
import { buildResultRows, buildTripOptions } from "../deep-links";
import {
  AIRLINE_SOURCE_COUNT,
  APPROVED_SOURCES,
  SOURCE_COUNT,
  buildSourceStatuses,
  getKeyPresence,
  hasAmadeusKeys,
  hasKiwiKey,
  hasSkyscannerKey,
} from "../sources";
import {
  sortCheapestPerSource,
  sortResultRows,
} from "../sort-results";
import { normalizeStayDays } from "../stays";
import type {
  CheapestPerSource,
  FlightOffer,
  ResultRow,
  SearchRequest,
  SearchResponse,
} from "../types";

export { sortOffers, sortResultRows } from "../sort-results";

function cheapestPerSource(rows: ResultRow[]): CheapestPerSource[] {
  const best = new Map<string, ResultRow>();
  for (const row of rows) {
    const prev = best.get(row.source);
    if (!prev || sortResultRows(row, prev) < 0) {
      best.set(row.source, row);
    }
  }
  return sortCheapestPerSource(
    [...best.values()].map((r) => ({
      source: r.source,
      sourcePriority: r.sourcePriority,
      outboundDate: r.outboundDate,
      returnDate: r.returnDate,
      stayDays: r.stayDays,
      price: r.price,
      purchaseUrl: r.purchaseUrl,
      stops: r.stops,
    }))
  );
}

function anyOptionalLiveKey(): boolean {
  return hasSkyscannerKey() || hasKiwiKey() || hasAmadeusKeys();
}

export async function runSearch(
  req: SearchRequest
): Promise<SearchResponse> {
  const origin = req.origin.toUpperCase().trim();
  const destination = req.destination.toUpperCase().trim();
  const stayDays = normalizeStayDays(req.stayDays);
  const nonstopOnly = Boolean(req.nonstopOnly);

  // Çok kaynak × tarih: çift sayısını sınırla
  const { pairs, total, sampled } = expandDatePairs(
    req.startDate,
    req.endDate,
    stayDays,
    20
  );

  const sources = buildSourceStatuses(false);

  if (!pairs.length) {
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
      nonstopOnly,
      keys: getKeyPresence(),
      adapters: [],
      sourceCount: SOURCE_COUNT,
      airlineCount: AIRLINE_SOURCE_COUNT,
      message:
        "Geçerli tarih çifti bulunamadı. Tarih aralığını veya konaklama süresini (2–21 gün) kontrol edin.",
    };
  }

  const tripOptions = buildTripOptions(
    origin,
    destination,
    pairs,
    nonstopOnly
  );
  let rows = buildResultRows(
    origin,
    destination,
    pairs,
    nonstopOnly,
    APPROVED_SOURCES
  );

  let offers: FlightOffer[] = [];
  const adapters: AdapterResult[] = [];
  let freePath = !anyOptionalLiveKey();

  // Ücretsiz fiyat önizleme (CAPTCHA bypass yok)
  const peek = await peekFreePrices(
    origin,
    destination,
    pairs,
    nonstopOnly
  );
  if (peek.hits.length) {
    rows = applyPreviewPrices(rows, peek.hits);
  }

  rows.sort(sortResultRows);
  const perSource = cheapestPerSource(rows);
  const overallCheapest = rows.find((r) => r.price != null) ?? null;
  const pricedCount = rows.filter((r) => r.price != null).length;

  let message =
    `Ücretsiz yol: ${total} tarih çifti` +
    (sampled ? ` (tabloda ${pairs.length} örnek)` : "") +
    ` × ${SOURCE_COUNT} kaynak (${AIRLINE_SOURCE_COUNT} havayolu) = ${rows.length} satır` +
    (nonstopOnly ? " · yalnızca aktarmasız niyeti" : "") +
    ".";

  if (pricedCount) {
    message += ` ${pricedCount} satırda ücretsiz önizleme fiyatı var (Google Flights best-effort; resmi partner API değil).`;
  } else {
    message +=
      " Sayısal fiyat şu an alınamadı" +
      (peek.error ? ` (${peek.error})` : "") +
      " — sütunda “Sitede gör”; deep-link’ler hazır.";
  }

  void offers;
  void adapters;

  return {
    rows,
    rowsTotal: rows.length,
    cheapestPerSource: perSource,
    overallCheapest,
    tripOptions,
    tripOptionsTotal: total,
    tripOptionsSampled: sampled,
    offers: [],
    sources,
    datePairsSearched: pairs.length,
    freePath,
    demo: false,
    nonstopOnly,
    keys: getKeyPresence(),
    adapters: [],
    sourceCount: SOURCE_COUNT,
    airlineCount: AIRLINE_SOURCE_COUNT,
    message,
  };
}
