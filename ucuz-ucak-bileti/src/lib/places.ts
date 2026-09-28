import { AIRPORTS, type Airport } from "./airports";

/** Tek havalimanı: `IST`. Şehir (tümü): `CITY:TR:istanbul` */
export type PlaceCode = string;

export type PlaceKind = "airport" | "city";

export type ResolvedPlace = {
  code: PlaceCode;
  kind: PlaceKind;
  label: string;
  shortLabel: string;
  city: string;
  country: string;
  /** Üye havalimanı IATA listesi (şehirde 2+) */
  airports: string[];
  /** Skyscanner path entity (ör. ista veya ist) */
  skyEntity: string;
  /** Kayak / Momondo / Kiwi segment (ör. IST,SAW veya IST) */
  kayakEntity: string;
  /** Google Flights #flt segment — birincil veya virgüllü */
  googleEntity: string;
  /** Kaynak tek kod istiyorsa kullanılacak birincil IATA */
  primaryIata: string;
  /** Kaynak multi desteklemiyorsa her havalimanı için satır genişlet */
  expandPerAirport: boolean;
};

export type CityGroup = {
  code: PlaceCode;
  city: string;
  country: string;
  airports: Airport[];
  label: string;
  search: string;
  skyEntity: string | null;
};

/** Bilinen Skyscanner şehir entity kodları (küçük harf). */
const SKY_CITY: Record<string, string> = {
  "TR|istanbul": "ista",
  "GB|london": "lond",
  "FR|paris": "pari",
  "US|new york": "nyca",
  "RU|moscow": "mosc",
  "IT|milan": "miln",
  "IT|rome": "rome",
  "DE|berlin": "berl",
  "ES|madrid": "madr",
  "ES|barcelona": "barc",
  "NL|amsterdam": "amst",
  "AE|dubai": "dxba",
  "SE|stockholm": "stoc",
  "AT|vienna": "vien",
  "CH|zurich": "zuri",
  "GR|athens": "athe",
  "JP|tokyo": "tyoa",
  "BR|sao paulo": "saoa",
  "BR|rio de janeiro": "rioa",
  "CA|toronto": "ytoa",
  "CA|montreal": "yula",
  "AU|sydney": "sydn",
  "AU|melbourne": "melb",
  "EG|cairo": "cair",
  "PL|warsaw": "waw",
  "CZ|prague": "prag",
  "HU|budapest": "bud",
  "PT|lisbon": "lisb",
  "IE|dublin": "dub",
  "NO|oslo": "oslo",
  "DK|copenhagen": "cph",
  "FI|helsinki": "hel",
  "BE|brussels": "brus",
  "TR|ankara": "anka",
  "TR|izmir": "izmi",
  "TR|antalya": "anta",
};

/** Şehir seçiminde askeri / küçük üsleri ele — ticari odaklı. */
const EXCLUDE_IATA = new Set([
  "CBM",
  "NIP",
  "NRB",
  "VQQ",
  "LRF",
  "CKL",
  "NHD",
  "LBG",
  "BQH",
  "NKX",
  "NZY",
  "SDM",
  "EDF",
  "MRI",
  "EIL",
  "FBK",
  "AFW",
  "FWH",
  "FTW",
  "MCC",
  "MHR",
  "SNZ",
  "RRJ",
]);

/** Bilinen büyük havalimanlarını öne al. */
const PREFERRED_ORDER = [
  "IST",
  "SAW",
  "LHR",
  "LGW",
  "STN",
  "LTN",
  "LCY",
  "CDG",
  "ORY",
  "BVA",
  "JFK",
  "EWR",
  "LGA",
  "SVO",
  "DME",
  "VKO",
  "ZIA",
  "FCO",
  "CIA",
  "MXP",
  "LIN",
  "BGY",
  "BER",
  "MAD",
  "BCN",
  "AMS",
  "DXB",
  "ARN",
  "BMA",
  "VIE",
  "ZRH",
  "ATH",
];

function sortCommercial(list: Airport[]): Airport[] {
  const rank = (iata: string) => {
    const i = PREFERRED_ORDER.indexOf(iata);
    return i === -1 ? 1000 : i;
  };
  return [...list].sort((a, b) => rank(a.iata) - rank(b.iata));
}

function normCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function cityKey(country: string, city: string): string {
  return `${country.toUpperCase()}|${normCity(city)}`;
}

function slugCity(city: string): string {
  return normCity(city)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeCityCode(country: string, city: string): PlaceCode {
  return `CITY:${country.toUpperCase()}:${slugCity(city)}`;
}

function commercialAirports(list: Airport[]): Airport[] {
  const filtered = list.filter((a) => !EXCLUDE_IATA.has(a.iata));
  const base = filtered.length >= 2 ? filtered : list;
  return sortCommercial(base);
}

const cityGroupsByCode = new Map<string, CityGroup>();
const cityGroupsList: CityGroup[] = [];

(function buildCityIndex() {
  const bucket = new Map<string, Airport[]>();
  for (const a of AIRPORTS) {
    const k = cityKey(a.country, a.city);
    if (!bucket.has(k)) bucket.set(k, []);
    bucket.get(k)!.push(a);
  }
  for (const [k, list] of bucket) {
    const commercial = commercialAirports(list);
    if (commercial.length < 2) continue;
    const [country, ] = k.split("|");
    const city = commercial[0].city;
    const code = makeCityCode(country, city);
    const sky = SKY_CITY[k] ?? SKY_CITY[`${country}|${normCity(city)}`] ?? null;
    const iatas = commercial.map((a) => a.iata);
    const g: CityGroup = {
      code,
      city,
      country,
      airports: commercial,
      label: `${city} (tüm havalimanları)`,
      search: `${normCity(city)} ${country.toLowerCase()} ${iatas.join(" ").toLowerCase()} tum all airports city`,
      skyEntity: sky,
    };
    cityGroupsByCode.set(code.toLowerCase(), g);
    // slug alias
    cityGroupsByCode.set(`city:${country.toLowerCase()}:${slugCity(city)}`, g);
    cityGroupsList.push(g);
  }
  cityGroupsList.sort((a, b) => a.city.localeCompare(b.city, "tr"));
})();

export function isCityCode(code: string): boolean {
  return /^CITY:/i.test(code.trim());
}

export function getCityGroup(code: string): CityGroup | undefined {
  return cityGroupsByCode.get(code.trim().toLowerCase());
}

export function listCityGroups(): CityGroup[] {
  return cityGroupsList;
}

export function placeLabel(code: string): string {
  const g = getCityGroup(code);
  if (g) return `${g.label} · ${g.airports.map((a) => a.iata).join(", ")}`;
  const a = AIRPORTS.find((x) => x.iata === code.toUpperCase());
  if (a) return `${a.city} — ${a.airport} (${a.iata})`;
  return code.toUpperCase();
}

/**
 * Form / API değeri → deep-link entity’leri.
 */
export function resolvePlace(code: string): ResolvedPlace | null {
  const raw = code.trim();
  if (!raw) return null;

  if (isCityCode(raw)) {
    const g = getCityGroup(raw);
    if (!g) return null;
    const iatas = g.airports.map((a) => a.iata);
    const primary = iatas.includes("IST")
      ? "IST"
      : iatas.includes("LHR")
        ? "LHR"
        : iatas[0];
    const kayak = iatas.join(",");
    const sky = g.skyEntity ?? primary.toLowerCase();
    return {
      code: g.code,
      kind: "city",
      label: `${g.label} (${iatas.join(", ")})`,
      shortLabel: g.label,
      city: g.city,
      country: g.country,
      airports: iatas,
      skyEntity: sky,
      kayakEntity: kayak,
      googleEntity: iatas.join(","),
      primaryIata: primary,
      // Skyscanner şehir kodu yoksa kaynak başına genişlet
      expandPerAirport: !g.skyEntity,
    };
  }

  const iata = raw.toUpperCase();
  if (!/^[A-Z]{3}$/.test(iata)) return null;
  const a = AIRPORTS.find((x) => x.iata === iata);
  return {
    code: iata,
    kind: "airport",
    label: a ? `${a.city} — ${a.airport} (${a.iata})` : iata,
    shortLabel: a ? `${a.city} (${a.iata})` : iata,
    city: a?.city ?? iata,
    country: a?.country ?? "",
    airports: [iata],
    skyEntity: iata.toLowerCase(),
    kayakEntity: iata,
    googleEntity: iata,
    primaryIata: iata,
    expandPerAirport: false,
  };
}

export function isValidPlace(code: string): boolean {
  return resolvePlace(code) != null;
}

/** Aynı şehir seçimi veya aynı IATA çakışması. */
export function placesOverlap(a: string, b: string): boolean {
  const pa = resolvePlace(a);
  const pb = resolvePlace(b);
  if (!pa || !pb) return false;
  if (pa.code.toLowerCase() === pb.code.toLowerCase()) return true;
  const setB = new Set(pb.airports);
  return pa.airports.some((x) => setB.has(x));
}

export type PlaceSuggestion =
  | { kind: "city"; group: CityGroup }
  | { kind: "airport"; airport: Airport };

/**
 * Arama: çoklu havalimanlı şehirlerde önce “tüm havalimanları” satırı.
 */
export function searchPlaces(query: string, limit = 40): PlaceSuggestion[] {
  const q = query.trim().toLowerCase();
  const out: PlaceSuggestion[] = [];
  const seenAirport = new Set<string>();
  const seenCity = new Set<string>();

  if (!q) {
    const preferredCities = [
      "CITY:TR:istanbul",
      "CITY:GB:london",
      "CITY:FR:paris",
      "CITY:US:new-york",
      "CITY:IT:rome",
      "CITY:DE:berlin",
    ];
    for (const c of preferredCities) {
      const g = getCityGroup(c);
      if (g && !seenCity.has(g.code)) {
        seenCity.add(g.code);
        out.push({ kind: "city", group: g });
      }
    }
    const preferredAirports = [
      "IST",
      "SAW",
      "AMS",
      "ESB",
      "ADB",
      "AYT",
      "LHR",
      "CDG",
      "FRA",
      "DXB",
    ];
    for (const code of preferredAirports) {
      const a = AIRPORTS.find((x) => x.iata === code);
      if (a && !seenAirport.has(a.iata)) {
        seenAirport.add(a.iata);
        out.push({ kind: "airport", airport: a });
      }
    }
    return out.slice(0, limit);
  }

  // Şehir grupları
  for (const g of cityGroupsList) {
    if (
      g.search.includes(q) ||
      normCity(g.city).startsWith(q) ||
      g.airports.some((a) => a.iata.toLowerCase() === q)
    ) {
      if (!seenCity.has(g.code)) {
        seenCity.add(g.code);
        out.push({ kind: "city", group: g });
      }
    }
    if (out.length >= limit) return out.slice(0, limit);
  }

  // Havalimanları
  for (const a of AIRPORTS) {
    const cityN = normCity(a.city);
    const match =
      a.iata.toLowerCase() === q ||
      a.iata.toLowerCase().startsWith(q) ||
      cityN.startsWith(q) ||
      cityN.includes(q) ||
      a.search.includes(q) ||
      a.airport.toLowerCase().includes(q);
    if (!match || seenAirport.has(a.iata)) continue;
    seenAirport.add(a.iata);
    out.push({ kind: "airport", airport: a });
    if (out.length >= limit) break;
  }

  // Şehir satırlarını üste al (aynı sorgu için)
  out.sort((x, y) => {
    if (x.kind === y.kind) return 0;
    return x.kind === "city" ? -1 : 1;
  });

  return out.slice(0, limit);
}
