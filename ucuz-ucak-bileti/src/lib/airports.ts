import type { Airport } from "./types";

/** Curated TR-origin + common destinations. Expand later via OurAirports. */
export const AIRPORTS: Airport[] = [
  { code: "IST", name: "İstanbul Havalimanı", city: "İstanbul", country: "TR", label: "İstanbul (IST)" },
  { code: "SAW", name: "Sabiha Gökçen", city: "İstanbul", country: "TR", label: "İstanbul Sabiha Gökçen (SAW)" },
  { code: "ISTA", name: "İstanbul (tüm havalimanları)", city: "İstanbul", country: "TR", label: "İstanbul (tüm — IST+SAW)" },
  { code: "ESB", name: "Esenboğa", city: "Ankara", country: "TR", label: "Ankara (ESB)" },
  { code: "ADB", name: "Adnan Menderes", city: "İzmir", country: "TR", label: "İzmir (ADB)" },
  { code: "AYT", name: "Antalya", city: "Antalya", country: "TR", label: "Antalya (AYT)" },
  { code: "BJV", name: "Milas-Bodrum", city: "Bodrum", country: "TR", label: "Bodrum (BJV)" },
  { code: "DLM", name: "Dalaman", city: "Dalaman", country: "TR", label: "Dalaman (DLM)" },
  { code: "TZX", name: "Trabzon", city: "Trabzon", country: "TR", label: "Trabzon (TZX)" },
  { code: "ADA", name: "Şakirpaşa", city: "Adana", country: "TR", label: "Adana (ADA)" },
  { code: "GZT", name: "Oğuzeli", city: "Gaziantep", country: "TR", label: "Gaziantep (GZT)" },
  { code: "ASR", name: "Erkilet", city: "Kayseri", country: "TR", label: "Kayseri (ASR)" },
  { code: "DIY", name: "Diyarbakır", city: "Diyarbakır", country: "TR", label: "Diyarbakır (DIY)" },
  { code: "VAN", name: "Ferit Melen", city: "Van", country: "TR", label: "Van (VAN)" },
  { code: "ECN", name: "Ercan", city: "Lefkoşa", country: "CY", label: "Lefkoşa / Ercan (ECN)" },
  { code: "AMS", name: "Schiphol", city: "Amsterdam", country: "NL", label: "Amsterdam (AMS)" },
  { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "DE", label: "Berlin (BER)" },
  { code: "FRA", name: "Frankfurt", city: "Frankfurt", country: "DE", label: "Frankfurt (FRA)" },
  { code: "MUC", name: "Münih", city: "Münih", country: "DE", label: "Münih (MUC)" },
  { code: "VIE", name: "Viyana", city: "Viyana", country: "AT", label: "Viyana (VIE)" },
  { code: "ZRH", name: "Zürih", city: "Zürih", country: "CH", label: "Zürih (ZRH)" },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR", label: "Paris CDG (CDG)" },
  { code: "LGW", name: "Gatwick", city: "Londra", country: "GB", label: "Londra Gatwick (LGW)" },
  { code: "STN", name: "Stansted", city: "Londra", country: "GB", label: "Londra Stansted (STN)" },
  { code: "FCO", name: "Fiumicino", city: "Roma", country: "IT", label: "Roma (FCO)" },
  { code: "BCN", name: "El Prat", city: "Barselona", country: "ES", label: "Barselona (BCN)" },
  { code: "ATH", name: "Atina", city: "Atina", country: "GR", label: "Atina (ATH)" },
  { code: "SKG", name: "Selanik", city: "Selanik", country: "GR", label: "Selanik (SKG)" },
  { code: "DXB", name: "Dubai", city: "Dubai", country: "AE", label: "Dubai (DXB)" },
  { code: "BAH", name: "Bahreyn", city: "Manama", country: "BH", label: "Bahreyn (BAH)" },
  { code: "CAI", name: "Kahire", city: "Kahire", country: "EG", label: "Kahire (CAI)" },
  { code: "JFK", name: "John F. Kennedy", city: "New York", country: "US", label: "New York JFK (JFK)" },
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
  if (!q) return AIRPORTS.slice(0, limit);
  const scored = AIRPORTS.map((a) => {
    const hay = foldText(`${a.code} ${a.name} ${a.city} ${a.label} ${a.country}`);
    let score = 0;
    if (foldText(a.code) === q) score = 100;
    else if (foldText(a.code).startsWith(q)) score = 90;
    else if (foldText(a.city).startsWith(q)) score = 80;
    else if (hay.includes(q)) score = 50;
    return { a, score };
  })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.a.label.localeCompare(y.a.label, "tr"));
  return scored.slice(0, limit).map((x) => x.a);
}

export function getAirport(code: string): Airport | undefined {
  return AIRPORTS.find((a) => a.code.toUpperCase() === code.toUpperCase());
}

/** Human city name preferred by Enuygun MCP (city/airport name, not always IATA). */
export function enuygunPlaceName(code: string): string {
  const a = getAirport(code);
  if (!a) return code;
  if (code.toUpperCase() === "ISTA") return "İstanbul";
  return a.city;
}
