/** Konaklama süresi seçenekleri: 2…21 gün (dahil). */
export const STAY_DAY_MIN = 2;
export const STAY_DAY_MAX = 21;

export const STAY_OPTIONS: number[] = Array.from(
  { length: STAY_DAY_MAX - STAY_DAY_MIN + 1 },
  (_, i) => STAY_DAY_MIN + i
);

export const DEFAULT_STAY_DAYS = [3, 4];

export function normalizeStayDays(raw: unknown): number[] {
  const arr = Array.isArray(raw) ? raw.map(Number) : [];
  const cleaned = [
    ...new Set(
      arr.filter(
        (n) =>
          Number.isFinite(n) &&
          n >= STAY_DAY_MIN &&
          n <= STAY_DAY_MAX
      )
    ),
  ].sort((a, b) => a - b);
  return cleaned.length ? cleaned : [...DEFAULT_STAY_DAYS];
}
