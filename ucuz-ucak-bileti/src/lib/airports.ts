import airportsJson from "@/data/airports.json";

export type Airport = {
  iata: string;
  city: string;
  airport: string;
  country: string;
  search: string;
};

export const AIRPORTS: Airport[] = airportsJson as Airport[];

export const AIRPORT_COUNT = AIRPORTS.length;

const byIata = new Map(AIRPORTS.map((a) => [a.iata, a]));

export function getAirport(iata: string): Airport | undefined {
  return byIata.get(iata.toUpperCase());
}

export function isValidIata(code: string): boolean {
  return /^[A-Za-z]{3}$/.test(code.trim());
}

/** Bilinen IATA veya 3 harfli kod (deep-link için). */
export function resolveIata(code: string): string {
  const c = code.trim().toUpperCase();
  if (!isValidIata(c)) return c;
  return c;
}

export function airportLabel(a: Airport): string {
  return `${a.city} — ${a.airport} (${a.iata})`;
}

export function cityLabel(iata: string): string {
  const a = getAirport(iata);
  if (!a) return iata.toUpperCase();
  return `${a.city} (${a.iata})`;
}

/**
 * İstemci tarafı arama — büyük listede kullanılabilir.
 * Boş sorgu: popüler / TR öncelikli kısa liste.
 */
export function searchAirports(query: string, limit = 40): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Varsayılan öneriler: TR büyükleri + sık Avrupa
    const preferred = [
      "IST",
      "SAW",
      "ESB",
      "ADB",
      "AYT",
      "BJV",
      "DLM",
      "TZX",
      "AMS",
      "BER",
      "FRA",
      "MUC",
      "LHR",
      "STN",
      "CDG",
      "FCO",
      "VIE",
      "ZRH",
      "BCN",
      "MAD",
      "ATH",
      "DXB",
    ];
    const out: Airport[] = [];
    for (const code of preferred) {
      const a = byIata.get(code);
      if (a) out.push(a);
    }
    return out.slice(0, limit);
  }

  const starts: Airport[] = [];
  const contains: Airport[] = [];
  for (const a of AIRPORTS) {
    if (a.iata.toLowerCase() === q) {
      starts.unshift(a);
      continue;
    }
    if (a.iata.toLowerCase().startsWith(q) || a.city.toLowerCase().startsWith(q)) {
      starts.push(a);
    } else if (a.search.includes(q)) {
      contains.push(a);
    }
    if (starts.length + contains.length > limit * 3) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function airportsForCountry(country: string): Airport[] {
  const c = country.toUpperCase();
  return AIRPORTS.filter((a) => a.country === c);
}
