import { expandDatePairs } from "../dates";
import { buildResultRows, buildTripOptions } from "../deep-links";
import {
  AIRLINE_SOURCE_COUNT,
  APPROVED_SOURCES,
  SOURCE_COUNT,
  buildSourceStatuses,
  getKeyPresence,
} from "../sources";
import {
  sortCheapestPerSource,
  sortResultRows,
} from "../sort-results";
import { normalizeStayDays } from "../stays";
import type {
  CheapestPerSource,
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

/**
 * Ücretsiz yol: deep-link satırları.
 * Sayısal fiyat YOK — uydurma / puppeteer “önizleme” / demo fiyat yok.
 * Fiyat yalnızca gerçek partner API (isteğe bağlı anahtar) ile gelirse
 * ayrı adaptörler eklenir; şu an hepsi “Sitede gör”.
 */
export async function runSearch(
  req: SearchRequest
): Promise<SearchResponse> {
  // Place kodlarını bozma: CITY:TR:istanbul → upper yalnızca IATA için
  const origin = req.origin.trim();
  const destination = req.destination.trim();
  const stayDays = normalizeStayDays(req.stayDays);
  const nonstopOnly = Boolean(req.nonstopOnly);

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
  const rows = buildResultRows(
    origin,
    destination,
    pairs,
    nonstopOnly,
    APPROVED_SOURCES
  );

  rows.sort(sortResultRows);
  const perSource = cheapestPerSource(rows);

  const message =
    `Ücretsiz yol: ${total} tarih çifti` +
    (sampled ? ` (tabloda ${pairs.length} örnek)` : "") +
    ` × ${SOURCE_COUNT} çalışan kaynak (${AIRLINE_SOURCE_COUNT} havayolu Skyscanner filtreli) = ${rows.length} satır` +
    (nonstopOnly ? " · yalnızca aktarmasız niyeti" : "") +
    ". Sayısal fiyat yok — yanlış fiyat göstermektense “Sitede gör”; canlı fiyat kaynak sitesinde.";

  return {
    rows,
    rowsTotal: rows.length,
    cheapestPerSource: perSource,
    overallCheapest: null,
    tripOptions,
    tripOptionsTotal: total,
    tripOptionsSampled: sampled,
    offers: [],
    sources,
    datePairsSearched: pairs.length,
    freePath: true,
    demo: false,
    nonstopOnly,
    keys: getKeyPresence(),
    adapters: [],
    sourceCount: SOURCE_COUNT,
    airlineCount: AIRLINE_SOURCE_COUNT,
    message,
  };
}
