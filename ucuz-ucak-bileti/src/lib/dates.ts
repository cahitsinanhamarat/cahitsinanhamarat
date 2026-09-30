/** Build round-trip date pairs inside a window for given stay lengths. */
export function generateDatePairs(options: {
  earliest: string;
  latest: string;
  minStayDays: number;
  maxStayDays: number;
  maxPairs?: number;
}): Array<{ depart: string; return: string; stayDays: number }> {
  const earliest = parseIsoDate(options.earliest);
  const latest = parseIsoDate(options.latest);
  if (!earliest || !latest || latest < earliest) return [];

  const minStay = Math.max(1, options.minStayDays);
  const maxStay = Math.max(minStay, options.maxStayDays);
  const maxPairs = Math.max(1, options.maxPairs ?? 8);

  const all: Array<{ depart: string; return: string; stayDays: number; score: number }> =
    [];

  for (
    let d = new Date(earliest.getTime());
    d <= latest;
    d = addDays(d, 1)
  ) {
    for (let stay = minStay; stay <= maxStay; stay++) {
      const ret = addDays(d, stay);
      if (ret > latest) continue;
      // Prefer mid-week + weekend mix by lightly scoring weekend departures.
      const dow = d.getUTCDay();
      const score = dow === 5 || dow === 6 ? 1 : 0;
      all.push({
        depart: toIsoDate(d),
        return: toIsoDate(ret),
        stayDays: stay,
        score,
      });
    }
  }

  if (all.length <= maxPairs) {
    return all.map(({ depart, return: r, stayDays }) => ({
      depart,
      return: r,
      stayDays,
    }));
  }

  // Evenly sample across the sorted list so the window is covered.
  all.sort((a, b) => a.depart.localeCompare(b.depart) || a.stayDays - b.stayDays);
  const picked: typeof all = [];
  const step = (all.length - 1) / (maxPairs - 1);
  for (let i = 0; i < maxPairs; i++) {
    const idx = Math.round(i * step);
    picked.push(all[idx]);
  }
  // Deduplicate identical pairs from rounding.
  const seen = new Set<string>();
  const unique: Array<{ depart: string; return: string; stayDays: number }> = [];
  for (const p of picked) {
    const key = `${p.depart}|${p.return}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ depart: p.depart, return: p.return, stayDays: p.stayDays });
  }
  return unique;
}

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function stayDaysBetween(depart: string, ret: string): number {
  const a = parseIsoDate(depart);
  const b = parseIsoDate(ret);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Convert YYYY-MM-DD → DD.MM.YYYY for Enuygun MCP. */
export function toTrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function fromTrDateTime(date: string, time: string): string {
  // date: DD.MM.YYYY, time: HH:mm
  const [dd, mm, yyyy] = date.split(".");
  return `${yyyy}-${mm}-${dd}T${time}`;
}

export function formatTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTrDisplayDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(d);
}
