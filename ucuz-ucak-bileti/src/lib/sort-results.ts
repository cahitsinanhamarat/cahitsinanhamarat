import type { CheapestPerSource, FlightOffer, ResultRow } from "./types";

/**
 * Birincil sıra: fiyat ucuz → pahalı.
 * Fiyatsız (link-only) satırlar her zaman fiyatlılardan sonra.
 * Eşit fiyatta (veya ikisi de null) kaynak önceliği (Skyscanner #1) kıran.
 * Sonra tarih / süre.
 */
export function compareByPriceThenSource(
  a: {
    price: number | null;
    sourcePriority: number;
    outboundDate?: string;
    returnDate?: string;
    stayDays?: number;
  },
  b: {
    price: number | null;
    sourcePriority: number;
    outboundDate?: string;
    returnDate?: string;
    stayDays?: number;
  }
): number {
  const aP = a.price != null;
  const bP = b.price != null;
  if (aP && !bP) return -1;
  if (!aP && bP) return 1;
  if (aP && bP && a.price !== b.price) {
    return (a.price as number) - (b.price as number);
  }
  // Eşit fiyat / ikisi de null → kaynak önceliği (Skyscanner #1 kazanır)
  if (a.sourcePriority !== b.sourcePriority) {
    return a.sourcePriority - b.sourcePriority;
  }
  if (a.outboundDate && b.outboundDate && a.outboundDate !== b.outboundDate) {
    return a.outboundDate.localeCompare(b.outboundDate);
  }
  if (a.returnDate && b.returnDate && a.returnDate !== b.returnDate) {
    return a.returnDate.localeCompare(b.returnDate);
  }
  if (
    a.stayDays != null &&
    b.stayDays != null &&
    a.stayDays !== b.stayDays
  ) {
    return a.stayDays - b.stayDays;
  }
  return 0;
}

export function sortResultRows(a: ResultRow, b: ResultRow): number {
  return compareByPriceThenSource(a, b);
}

export function sortOffers(a: FlightOffer, b: FlightOffer): number {
  return compareByPriceThenSource(a, b);
}

export function sortCheapestPerSource(
  rows: CheapestPerSource[]
): CheapestPerSource[] {
  return [...rows].sort(compareByPriceThenSource);
}

/** Sıra doğrulama — fiyatlılar artan; fiyatsızlar sonda. */
export function isPriceAscending(rows: { price: number | null }[]): boolean {
  let lastPriced = -Infinity;
  let seenUnpriced = false;
  for (const r of rows) {
    if (r.price == null) {
      seenUnpriced = true;
      continue;
    }
    if (seenUnpriced) return false;
    if (r.price < lastPriced) return false;
    lastPriced = r.price;
  }
  return true;
}
