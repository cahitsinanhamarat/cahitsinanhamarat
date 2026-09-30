import airportsJson from "@/data/airports.json";
import type { Airport } from "./types";

export const AIRPORTS = airportsJson as Airport[];

const POPULAR_CODES = [
  "ISTA",
  "IST",
  "SAW",
  "ESB",
  "ADB",
  "AYT",
  "LON",
  "PAR",
  "AMS",
  "BER",
  "FRA",
  "MUC",
  "VIE",
  "ZRH",
  "FCO",
  "ROM",
  "MIL",
  "BCN",
  "MAD",
  "ATH",
  "DXB",
  "DOH",
  "BAH",
  "CAI",
  "NYC",
  "JFK",
  "EWR",
  "ORD",
  "LAX",
  "SFO",
  "YYZ",
  "NRT",
  "HND",
  "TYO",
  "ICN",
  "BKK",
  "SIN",
  "KUL",
  "HKG",
  "SYD",
  "ECN",
  "TBS",
  "GYD",
  "EVN",
];

/** Turkish İ/ı-aware fold for airport search. */
export function foldText(input: string): string {
  return input
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function searchAirports(query: string, limit = 12): Airport[] {
  const q = foldText(query.trim());
  if (!q) {
    const byCode = new Map(AIRPORTS.map((a) => [a.code, a]));
    const popular = POPULAR_CODES.map((c) => byCode.get(c)).filter(
      Boolean,
    ) as Airport[];
    return popular.slice(0, limit);
  }

  const scored = AIRPORTS.map((a) => {
    const hay = foldText(
      `${a.code} ${a.name} ${a.city} ${a.label} ${a.country} ${(a.members || []).join(" ")}`,
    );
    let score = 0;
    if (foldText(a.code) === q) score = 100;
    else if (foldText(a.code).startsWith(q)) score = 90;
    else if (foldText(a.city) === q) score = 88;
    else if (foldText(a.city).startsWith(q)) score = 80;
    else if (hay.includes(q)) score = 50;
    // Prefer city “tüm havalimanları” groups slightly when city name matches.
    if (score >= 80 && a.kind === "city") score += 5;
    return { a, score };
  })
    .filter((x) => x.score > 0)
    .sort(
      (x, y) =>
        y.score - x.score ||
        (x.a.kind === "city" ? 0 : 1) - (y.a.kind === "city" ? 0 : 1) ||
        x.a.label.localeCompare(y.a.label, "tr"),
    );
  return scored.slice(0, limit).map((x) => x.a);
}

export function getAirport(code: string): Airport | undefined {
  return AIRPORTS.find((a) => a.code.toUpperCase() === code.toUpperCase());
}

export function resolveMemberIatas(code: string): string[] {
  const a = getAirport(code);
  if (!a) return [code.toUpperCase()];
  if (a.kind === "city" && a.members?.length) return [...a.members];
  return [a.code];
}

/** Human city/airport name preferred by Enuygun MCP. */
export function enuygunPlaceName(code: string): string {
  const a = getAirport(code);
  if (!a) return code;
  // City groups → city name (ENUYGUN resolves metro areas better by city).
  if (a.kind === "city") return a.city;
  return a.city || a.name;
}

export function airportStats() {
  return {
    airportCount: AIRPORTS.filter((a) => a.kind !== "city").length,
    cityGroupCount: AIRPORTS.filter((a) => a.kind === "city").length,
    total: AIRPORTS.length,
  };
}

/** Skyscanner.com.tr path segment for open-site (discovery only — not verified price). */
export function skyscannerPlaceSlug(code: string): string {
  const upper = code.toUpperCase();
  const citySlugs: Record<string, string> = {
    ISTA: "ista",
    LON: "lond",
    PAR: "pari",
    NYC: "nyca",
    ROM: "rome",
    MIL: "mila",
    TYO: "tyoa",
    OSA: "osaw",
    BJS: "bjsa",
    CHI: "chio",
    WAS: "wasa",
    MOW: "mowa",
    SEL: "sela",
    YTO: "ytoa",
    SAO: "saoa",
    RIO: "rioa",
    BUE: "buea",
    QSF: "sfoa",
  };
  if (citySlugs[upper]) return citySlugs[upper];
  const members = resolveMemberIatas(upper);
  return members[0].toLowerCase();
}
