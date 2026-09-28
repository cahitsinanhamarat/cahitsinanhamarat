import type { DatePair } from "./dates";
import { APPROVED_SOURCES, type SourceDef } from "./sources";
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

/** Kaynak başına gidiş-dönüş arama deep-link’i (doğrulanmış şemalar). */
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

  // Havayolu → Skyscanner airline filtresi (çalışan arama sayfası)
  if (sourceId.startsWith("airline-")) {
    const iata = sourceId.replace("airline-", "").toUpperCase();
    const directs = ns ? "true" : "false";
    return `https://www.skyscanner.com.tr/transport/flights/${o.toLowerCase()}/${d.toLowerCase()}/${depC}/${retC}/?adults=1&cabinclass=economy&rtn=1&preferdirects=${directs}&airlines=${iata.toLowerCase()}`;
  }

  switch (sourceId) {
    case "skyscanner":
      return `https://www.skyscanner.com.tr/transport/flights/${o.toLowerCase()}/${d.toLowerCase()}/${depC}/${retC}/?adults=1&cabinclass=economy&rtn=1&preferdirects=${ns ? "true" : "false"}`;
    case "kayak":
      return `https://www.kayak.com.tr/flights/${o}-${d}/${dep}/${ret}?sort=bestflight_a${ns ? "&fs=stops=0" : ""}`;
    case "google-flights": {
      const base = `https://www.google.com/travel/flights?hl=tr&curr=TRY#flt=${o}.${d}.${dep}*${d}.${o}.${ret}`;
      return ns ? `${base};tt:o` : base;
    }
    case "kiwi":
      return `https://www.kiwi.com/tr/search/results/${o}-${d}/${dep}/${ret}?adults=1&currency=try${ns ? "&stopNumber=0" : ""}`;
    case "momondo":
      return `https://www.momondo.com/flight-search/${o}-${d}/${dep}/${ret}?sort=bestflight_a${ns ? "&fs=stops=0" : ""}`;
    case "trip":
      return `https://www.trip.com/flights/${o.toLowerCase()}-to-${d.toLowerCase()}/roundtrip-${o.toLowerCase()}-${d.toLowerCase()}/?dcity=${o}&acity=${d}&ddate=${dep}&rdate=${ret}&adult=1${ns ? "&nonstop=1" : ""}`;
    case "booking":
      return `https://www.booking.com/flights/index.html?type=ROUNDTRIP&from=${o}&to=${d}&depart=${dep}&return=${ret}&adults=1${ns ? "&stops=0" : ""}`;
    case "edreams":
      return `https://www.edreams.com/travel/#results/type=R;from=${o};to=${d};dep=${dep};ret=${ret};adults=1${ns ? ";direct=true" : ""}`;
    case "expedia":
      return `https://www.expedia.com/Flights-Search?trip=roundtrip&leg1=from:${o},to:${d},departure:${dep}TANYT&leg2=from:${d},to:${o},departure:${ret}TANYT&passengers=adults:1&mode=search${ns ? "&maxNumStopsForEachDirection=0" : ""}`;
    default:
      // Bilinmeyen id → Skyscanner (asla sahte fiyat / rastgele Google araması değil)
      return `https://www.skyscanner.com.tr/transport/flights/${o.toLowerCase()}/${d.toLowerCase()}/${depC}/${retC}/?adults=1&cabinclass=economy&rtn=1`;
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
  return "Aktarmasız / aktarmalı";
}

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
    mode: mode === "demo" ? "link-out" : mode,
    stops,
    stopCount,
  }));
}
