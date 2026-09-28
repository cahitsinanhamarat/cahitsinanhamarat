/** YYYY-MM-DD parsed as UTC noon to avoid DST edge cases. */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function formatYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return formatYmd(d);
}

export type DatePair = {
  departure: string;
  returnDate: string;
  stayDays: number;
};

/**
 * Tarih aralığı + konaklama sürelerinden gidiş/dönüş çiftleri üretir.
 * Çok fazla çift olursa eşit aralıklı örnekleme ile üst sınır uygulanır.
 */
export function expandDatePairs(
  startDate: string,
  endDate: string,
  stayDays: number[],
  maxPairs = 40
): DatePair[] {
  const stays = [...new Set(stayDays.filter((n) => n > 0))].sort((a, b) => a - b);
  if (stays.length === 0) return [];

  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (end < start) return [];

  const all: DatePair[] = [];
  for (const stay of stays) {
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      const dep = new Date(t);
      const depYmd = formatYmd(dep);
      const retYmd = addDays(depYmd, stay);
      if (parseYmd(retYmd) <= end) {
        all.push({ departure: depYmd, returnDate: retYmd, stayDays: stay });
      }
    }
  }

  if (all.length <= maxPairs) return all;

  // Eşit aralıklı örnekleme — tüm aralık + süreleri temsil etsin
  const sampled: DatePair[] = [];
  const step = all.length / maxPairs;
  for (let i = 0; i < maxPairs; i++) {
    sampled.push(all[Math.floor(i * step)]);
  }
  return sampled;
}

export function formatTrDate(ymd: string): string {
  const d = parseYmd(ymd);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTrDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // date-only
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return formatTrDate(iso);
    return iso;
  }
  return d.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
