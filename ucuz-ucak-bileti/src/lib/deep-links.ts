import type { DatePair } from "./dates";
import {
  AIRLINE_BOOK_TEMPLATES,
  APPROVED_SOURCES,
  type SourceDef,
} from "./sources";
import type {
  FlightOffer,
  ResultRow,
  SourceLink,
  StopsKind,
  TripOption,
} from "./types";

export type DeepLinkParams = {
  origin: string;
  destination: string;
  pair: DatePair;
  nonstopOnly?: boolean;
};

function ymdCompact(ymd: string): string {
  return ymd.replace(/-/g, "");
}

function withNonstopParam(url: string, nonstopOnly: boolean, style: "stops0" | "direct" | "query"): string {
  if (!nonstopOnly) return url;
  if (style === "stops0") {
    return url.includes("?") ? `${url}&stops=0` : `${url}?stops=0`;
  }
  if (style === "direct") {
    return url.includes("?")
      ? `${url}&preferdirects=true&stops=0`
      : `${url}?preferdirects=true&stops=0`;
  }
  return url.includes("?") ? `${url}&direct=true` : `${url}?direct=true`;
}

/** Kaynak başına gidiş-dönüş arama deep-link’i. */
export function buildDeepLink(
  sourceId: string,
  p: DeepLinkParams
): string {
  const { origin: o, destination: d, pair, nonstopOnly = false } = p;
  const dep = pair.departure;
  const ret = pair.returnDate;
  const depC = ymdCompact(dep);
  const retC = ymdCompact(ret);
  const ns = nonstopOnly;

  // Airline sources: airline-xx
  if (sourceId.startsWith("airline-")) {
    const iata = sourceId.replace("airline-", "").toUpperCase();
    const tpl = AIRLINE_BOOK_TEMPLATES[iata];
    if (tpl) {
      let url = tpl
        .replaceAll("{o}", o)
        .replaceAll("{d}", d)
        .replaceAll("{dep}", dep)
        .replaceAll("{ret}", ret);
      return withNonstopParam(url, ns, "direct");
    }
    // Fallback: Google Flights filtered by airline + nonstop intent
    const q = ns
      ? `flights ${o} to ${d} ${dep} ${ret} ${iata} nonstop`
      : `flights ${o} to ${d} ${dep} ${ret} ${iata}`;
    return `https://www.google.com/travel/flights?hl=tr&curr=TRY&q=${encodeURIComponent(q)}`;
  }

  switch (sourceId) {
    case "skyscanner":
      return withNonstopParam(
        `https://www.skyscanner.com.tr/transport/flights/${o.toLowerCase()}/${d.toLowerCase()}/${depC}/${retC}/?adults=1&cabinclass=economy&rtn=1&preferdirects=${ns ? "true" : "false"}`,
        ns,
        "stops0"
      );
    case "enuygun":
      return withNonstopParam(
        `https://www.enuygun.com/ucak-bileti/arama/${o}-${d}/?gidis=${dep}&donus=${ret}&yetiskin=1&sinif=ekonomi${ns ? "&aktarma=direkt" : ""}`,
        ns,
        "stops0"
      );
    case "kayak":
      return withNonstopParam(
        `https://www.kayak.com.tr/flights/${o}-${d}/${dep}/${ret}?sort=bestflight_a${ns ? "&fs=stops=0" : ""}`,
        false,
        "stops0"
      );
    case "google-flights": {
      // tfs-style hash; append nonstop via query when requested
      const base = `https://www.google.com/travel/flights?hl=tr&curr=TRY#flt=${o}.${d}.${dep}*${d}.${o}.${ret}`;
      return ns ? `${base};tt:o` : base; // tt:o ≈ nonstop intent in GF hash
    }
    case "turna":
      return withNonstopParam(
        `https://www.turna.com/ucak-bileti/${o.toLowerCase()}-${d.toLowerCase()}?departureDate=${dep}&returnDate=${ret}&adult=1${ns ? "&direct=true" : ""}`,
        false,
        "direct"
      );
    case "ucuzabilet":
      return withNonstopParam(
        `https://www.ucuzabilet.com/ucak-bileti/${o}-${d}?gidistar=${dep}&donustar=${ret}&yetiskin=1`,
        ns,
        "direct"
      );
    case "biletall":
      return withNonstopParam(
        `https://www.biletall.com/ucak-bileti/${o}-${d}?gidis=${dep}&donus=${ret}&yetiskin=1`,
        ns,
        "direct"
      );
    case "obilet":
      return withNonstopParam(
        `https://www.obilet.com/ucak-bileti?nereden=${o}&nereye=${d}&gidis=${dep}&donus=${ret}&yetiskin=1`,
        ns,
        "direct"
      );
    case "kiwi":
      return withNonstopParam(
        `https://www.kiwi.com/tr/search/results/${o}-${d}/${dep}/${ret}?adults=1&currency=try${ns ? "&stopNumber=0" : ""}`,
        false,
        "stops0"
      );
    case "momondo":
      return withNonstopParam(
        `https://www.momondo.com/flight-search/${o}-${d}/${dep}/${ret}?sort=bestflight_a${ns ? "&fs=stops=0" : ""}`,
        false,
        "stops0"
      );
    case "expedia":
      return withNonstopParam(
        `https://www.expedia.com/Flights-Search?trip=roundtrip&leg1=from:${o},to:${d},departure:${dep}TANYT&leg2=from:${d},to:${o},departure:${ret}TANYT&passengers=adults:1&mode=search${ns ? "&maxNumStopsForEachDirection=0" : ""}`,
        false,
        "stops0"
      );
    case "booking":
      return withNonstopParam(
        `https://www.booking.com/flights/index.html?type=ROUNDTRIP&from=${o}&to=${d}&depart=${dep}&return=${ret}&adults=1${ns ? "&stops=0" : ""}`,
        false,
        "stops0"
      );
    case "trip":
      return withNonstopParam(
        `https://www.trip.com/flights/${o.toLowerCase()}-to-${d.toLowerCase()}/roundtrip-${o.toLowerCase()}-${d.toLowerCase()}/?dcity=${o}&acity=${d}&ddate=${dep}&rdate=${ret}&adult=1${ns ? "&nonstop=1" : ""}`,
        false,
        "stops0"
      );
    case "edreams":
      return withNonstopParam(
        `https://www.edreams.com/travel/#results/type=R;from=${o};to=${d};dep=${dep};ret=${ret};adults=1${ns ? ";direct=true" : ""}`,
        false,
        "stops0"
      );
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(
        `${o} ${d} uçuş ${dep} ${ret}${ns ? " aktarmasız" : ""}`
      )}`;
  }
}

export function stopsLabel(
  stops: StopsKind,
  stopCount: number | null
): string {
  if (stops === "nonstop") return "Aktarmasız";
  if (stops === "connecting") {
    return stopCount != null ? `Aktarmalı (${stopCount})` : "Aktarmalı";
  }
  // Ücretsiz deep-link yolunda kesin stop bilinmez; bilinmiyor son çare değil —
  // arama filtresizken her iki seçenek de mümkün.
  return "Aktarmasız / aktarmalı";
}

/**
 * Ücretsiz yolda stop bilgisi:
 * - nonstopOnly araması → linkler aktarmasız niyeti taşır → "nonstop" etiketle
 * - aksi halde bilinmiyor (kaynak sitesinde kesinleşir)
 */
export function expectedStops(nonstopOnly: boolean): {
  stops: StopsKind;
  stopCount: number | null;
} {
  if (nonstopOnly) return { stops: "nonstop", stopCount: 0 };
  return { stops: "unknown", stopCount: null };
}

export function buildSourceLinksForPair(
  origin: string,
  destination: string,
  pair: DatePair,
  nonstopOnly = false
): SourceLink[] {
  return APPROVED_SOURCES.map((src) => ({
    id: src.id,
    name: src.name,
    priority: src.priority,
    url: buildDeepLink(src.id, { origin, destination, pair, nonstopOnly }),
  }));
}

export function buildTripOptions(
  origin: string,
  destination: string,
  pairs: DatePair[],
  nonstopOnly = false
): TripOption[] {
  return pairs.map((pair) => {
    const links = buildSourceLinksForPair(
      origin,
      destination,
      pair,
      nonstopOnly
    );
    return {
      id: `trip-${pair.departure}-${pair.returnDate}-${pair.stayDays}`,
      departure: pair.departure,
      returnDate: pair.returnDate,
      stayDays: pair.stayDays,
      links,
      primaryUrl: links[0]?.url ?? "#",
      price: null,
      currency: "TRY" as const,
    };
  });
}

export function buildResultRows(
  origin: string,
  destination: string,
  pairs: DatePair[],
  nonstopOnly = false,
  sources: SourceDef[] = APPROVED_SOURCES
): ResultRow[] {
  const { stops, stopCount } = expectedStops(nonstopOnly);
  const rows: ResultRow[] = [];
  for (const pair of pairs) {
    for (const src of sources) {
      rows.push({
        id: `row-${src.id}-${pair.departure}-${pair.returnDate}-${pair.stayDays}`,
        sourceId: src.id,
        source: src.name,
        sourcePriority: src.priority,
        outboundDate: pair.departure,
        returnDate: pair.returnDate,
        stayDays: pair.stayDays,
        price: null,
        currency: "TRY",
        purchaseUrl: buildDeepLink(src.id, {
          origin,
          destination,
          pair,
          nonstopOnly,
        }),
        mode: "link-out",
        stops,
        stopCount,
      });
    }
  }
  return rows;
}

export function buildLinkOutOffers(
  origin: string,
  destination: string,
  pair: DatePair,
  mode: "link-out" | "demo" = "link-out",
  nonstopOnly = false
): FlightOffer[] {
  const { stops, stopCount } = expectedStops(nonstopOnly);
  return APPROVED_SOURCES.map((src) => ({
    id: `link-${src.id}-${pair.departure}-${pair.stayDays}`,
    source: src.name,
    sourcePriority: src.priority,
    price: null,
    currency: "TRY" as const,
    airline: "Kaynak sitesinde görüntüle",
    outbound: {
      departure: `${pair.departure}T09:00:00`,
      arrival: `${pair.departure}T12:00:00`,
      from: origin,
      to: destination,
    },
    inbound: {
      departure: `${pair.returnDate}T15:00:00`,
      arrival: `${pair.returnDate}T18:00:00`,
      from: destination,
      to: origin,
    },
    stayDays: pair.stayDays,
    purchaseUrl: buildDeepLink(src.id, {
      origin,
      destination,
      pair,
      nonstopOnly,
    }),
    mode,
    stops,
    stopCount,
  }));
}
