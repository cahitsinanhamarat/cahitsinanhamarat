import type { DatePair } from "./dates";
import {
  resolvePlace,
  type ResolvedPlace,
} from "./places";
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

function placeOrThrow(code: string): ResolvedPlace {
  const p = resolvePlace(code);
  if (!p) {
    // Son çare: 3 harfli kod gibi kullan
    const iata = code.trim().toUpperCase().slice(0, 3);
    return {
      code: iata,
      kind: "airport",
      label: iata,
      shortLabel: iata,
      city: iata,
      country: "",
      airports: [iata],
      skyEntity: iata.toLowerCase(),
      kayakEntity: iata,
      googleEntity: iata,
      primaryIata: iata,
      expandPerAirport: false,
    };
  }
  return p;
}

/** Kaynak multi-airport / city destekliyor mu? */
function sourceSupportsMulti(sourceId: string): boolean {
  if (sourceId.startsWith("airline-")) return true; // Skyscanner tabanlı
  return [
    "skyscanner",
    "kayak",
    "kiwi",
    "momondo",
    "google-flights",
    "expedia",
  ].includes(sourceId);
}

function skyPath(p: ResolvedPlace): string {
  return p.skyEntity;
}

function kayakPath(p: ResolvedPlace): string {
  return p.kayakEntity;
}

/**
 * Deep-link üret. Multi desteklemeyen kaynaklarda primaryIATA kullan
 * (satır genişletmesi buildResultRows’ta).
 */
export function buildDeepLink(
  sourceId: string,
  p: DeepLinkParams
): string {
  const origin = placeOrThrow(p.origin);
  const destination = placeOrThrow(p.destination);
  const multiOk = sourceSupportsMulti(sourceId);
  const oPlace = multiOk
    ? origin
    : {
        ...origin,
        skyEntity: origin.primaryIata.toLowerCase(),
        kayakEntity: origin.primaryIata,
        googleEntity: origin.primaryIata,
      };
  const dPlace = multiOk
    ? destination
    : {
        ...destination,
        skyEntity: destination.primaryIata.toLowerCase(),
        kayakEntity: destination.primaryIata,
        googleEntity: destination.primaryIata,
      };

  const dep = p.pair.departure;
  const ret = p.pair.returnDate;
  const depC = ymdCompact(dep);
  const retC = ymdCompact(ret);
  const ns = Boolean(p.nonstopOnly);

  const oSky = skyPath(oPlace);
  const dSky = skyPath(dPlace);
  const oKayak = kayakPath(oPlace);
  const dKayak = kayakPath(dPlace);
  const oGf = oPlace.googleEntity.split(",")[0];
  const dGf = dPlace.googleEntity.split(",")[0];
  // Google: şehirde birden fazla ise sorgu metni daha iyi çalışır
  const gfMulti =
    oPlace.kind === "city" || dPlace.kind === "city"
      ? `https://www.google.com/travel/flights?hl=tr&curr=TRY&q=${encodeURIComponent(
          `Flights from ${oPlace.kind === "city" ? oPlace.city : oPlace.primaryIata} to ${dPlace.kind === "city" ? dPlace.city : dPlace.primaryIata} on ${dep} through ${ret}${ns ? " nonstop" : ""}`
        )}`
      : null;

  if (sourceId.startsWith("airline-")) {
    const iata = sourceId.replace("airline-", "").toUpperCase();
    const directs = ns ? "true" : "false";
    return `https://www.skyscanner.com.tr/transport/flights/${oSky}/${dSky}/${depC}/${retC}/?adults=1&cabinclass=economy&rtn=1&preferdirects=${directs}&airlines=${iata.toLowerCase()}`;
  }

  switch (sourceId) {
    case "skyscanner":
      return `https://www.skyscanner.com.tr/transport/flights/${oSky}/${dSky}/${depC}/${retC}/?adults=1&cabinclass=economy&rtn=1&preferdirects=${ns ? "true" : "false"}`;
    case "kayak":
      return `https://www.kayak.com.tr/flights/${oKayak}-${dKayak}/${dep}/${ret}?sort=bestflight_a${ns ? "&fs=stops=0" : ""}`;
    case "google-flights": {
      if (gfMulti) return gfMulti;
      const base = `https://www.google.com/travel/flights?hl=tr&curr=TRY#flt=${oGf}.${dGf}.${dep}*${dGf}.${oGf}.${ret}`;
      return ns ? `${base};tt:o` : base;
    }
    case "kiwi":
      return `https://www.kiwi.com/tr/search/results/${oKayak}-${dKayak}/${dep}/${ret}?adults=1&currency=try${ns ? "&stopNumber=0" : ""}`;
    case "momondo":
      return `https://www.momondo.com/flight-search/${oKayak}-${dKayak}/${dep}/${ret}?sort=bestflight_a${ns ? "&fs=stops=0" : ""}`;
    case "trip": {
      const o = oPlace.primaryIata;
      const d = dPlace.primaryIata;
      return `https://www.trip.com/flights/${o.toLowerCase()}-to-${d.toLowerCase()}/roundtrip-${o.toLowerCase()}-${d.toLowerCase()}/?dcity=${o}&acity=${d}&ddate=${dep}&rdate=${ret}&adult=1${ns ? "&nonstop=1" : ""}`;
    }
    case "booking": {
      const o = oPlace.primaryIata;
      const d = dPlace.primaryIata;
      return `https://www.booking.com/flights/index.html?type=ROUNDTRIP&from=${o}&to=${d}&depart=${dep}&return=${ret}&adults=1${ns ? "&stops=0" : ""}`;
    }
    case "edreams": {
      const o = oPlace.primaryIata;
      const d = dPlace.primaryIata;
      return `https://www.edreams.com/travel/#results/type=R;from=${o};to=${d};dep=${dep};ret=${ret};adults=1${ns ? ";direct=true" : ""}`;
    }
    case "expedia": {
      // Expedia: virgüllü IATA veya birincil
      const o =
        oPlace.kind === "city" ? oPlace.kayakEntity : oPlace.primaryIata;
      const d =
        dPlace.kind === "city" ? dPlace.kayakEntity : dPlace.primaryIata;
      return `https://www.expedia.com/Flights-Search?trip=roundtrip&leg1=from:${o},to:${d},departure:${dep}TANYT&leg2=from:${d},to:${o},departure:${ret}TANYT&passengers=adults:1&mode=search${ns ? "&maxNumStopsForEachDirection=0" : ""}`;
    }
    default:
      return `https://www.skyscanner.com.tr/transport/flights/${oSky}/${dSky}/${depC}/${retC}/?adults=1&cabinclass=economy&rtn=1`;
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

/**
 * Sonuç satırları. Multi desteklemeyen kaynak + şehir seçimi →
 * her üye havalimanı için satır (expand).
 */
export function buildResultRows(
  origin: string,
  destination: string,
  pairs: DatePair[],
  nonstopOnly = false,
  sources: SourceDef[] = APPROVED_SOURCES
): ResultRow[] {
  const { stops, stopCount } = expectedStops(nonstopOnly);
  const oPlace = placeOrThrow(origin);
  const dPlace = placeOrThrow(destination);
  const rows: ResultRow[] = [];

  for (const pair of pairs) {
    for (const src of sources) {
      const multiOk = sourceSupportsMulti(src.id);
      const needExpand =
        !multiOk &&
        (oPlace.expandPerAirport ||
          dPlace.expandPerAirport ||
          ((oPlace.kind === "city" || dPlace.kind === "city") &&
            !multiOk));

      if (!needExpand) {
        rows.push(
          makeRow(
            src,
            origin,
            destination,
            pair,
            nonstopOnly,
            stops,
            stopCount,
            null
          )
        );
        continue;
      }

      // Genişlet: multi yok → üye IATA kombinasyonları (üst sınır)
      const origins =
        oPlace.kind === "city" && !multiOk ? oPlace.airports : [origin];
      const dests =
        dPlace.kind === "city" && !multiOk ? dPlace.airports : [destination];
      let n = 0;
      for (const o of origins) {
        for (const d of dests) {
          if (n >= 6) break; // satır patlamasını sınırla
          rows.push(
            makeRow(src, o, d, pair, nonstopOnly, stops, stopCount, {
              cityOrigin: oPlace.kind === "city" ? oPlace.shortLabel : null,
              cityDest: dPlace.kind === "city" ? dPlace.shortLabel : null,
            })
          );
          n++;
        }
      }
    }
  }
  return rows;
}

function makeRow(
  src: SourceDef,
  origin: string,
  destination: string,
  pair: DatePair,
  nonstopOnly: boolean,
  stops: StopsKind,
  stopCount: number | null,
  cityHint: { cityOrigin: string | null; cityDest: string | null } | null
): ResultRow {
  const oRes = resolvePlace(origin);
  const dRes = resolvePlace(destination);
  let name = src.name;
  if (cityHint?.cityOrigin || cityHint?.cityDest) {
    const bits = [
      oRes?.kind === "airport" ? oRes.primaryIata : null,
      dRes?.kind === "airport" ? dRes.primaryIata : null,
    ].filter(Boolean);
    if (bits.length) name = `${src.name} (${bits.join("→")})`;
  }
  return {
    id: `row-${src.id}-${origin}-${destination}-${pair.departure}-${pair.returnDate}-${pair.stayDays}`,
    sourceId: src.id,
    source: name,
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
  };
}

export function buildLinkOutOffers(
  origin: string,
  destination: string,
  pair: DatePair,
  mode: "link-out" | "demo" = "link-out",
  nonstopOnly = false
): FlightOffer[] {
  const { stops, stopCount } = expectedStops(nonstopOnly);
  const o = placeOrThrow(origin);
  const d = placeOrThrow(destination);
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
      from: o.primaryIata,
      to: d.primaryIata,
    },
    inbound: {
      departure: `${pair.returnDate}T15:00:00`,
      arrival: `${pair.returnDate}T18:00:00`,
      from: d.primaryIata,
      to: o.primaryIata,
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
