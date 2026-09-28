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

export type ExpandResult = {
  pairs: DatePair[];
  total: number;
  sampled: boolean;
};

/**
 * Tarih aralığı + konaklama sürelerinden gidiş/dönüş çiftleri.
 * maxPairs aşılırsa eşit aralıklı örnekleme (UI/performans için).
 */
export function expandDatePairs(
  startDate: string,
  endDate: string,
  stayDays: number[],
  maxPairs = 150
): ExpandResult {
  const stays = [...new Set(stayDays.filter((n) => n > 0))].sort((a, b) => a - b);
  if (stays.length === 0) {
    return { pairs: [], total: 0, sampled: false };
  }

  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (end < start) return { pairs: [], total: 0, sampled: false };

  const all: DatePair[] = [];
  for (const stay of stays) {
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      const depYmd = formatYmd(new Date(t));
      const retYmd = addDays(depYmd, stay);
      if (parseYmd(retYmd) <= end) {
        all.push({ departure: depYmd, returnDate: retYmd, stayDays: stay });
      }
    }
  }

  // Kronolojik + süre
  all.sort((a, b) => {
    if (a.departure !== b.departure) return a.departure.localeCompare(b.departure);
    return a.stayDays - b.stayDays;
  });

  if (all.length <= maxPairs) {
    return { pairs: all, total: all.length, sampled: false };
  }

  const sampled: DatePair[] = [];
  const step = all.length / maxPairs;
  for (let i = 0; i < maxPairs; i++) {
    sampled.push(all[Math.floor(i * step)]);
  }
  return { pairs: sampled, total: all.length, sampled: true };
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
