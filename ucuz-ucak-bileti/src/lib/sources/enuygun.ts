import { enuygunPlaceName } from "../airports";
import { fromTrDateTime, stayDaysBetween, toTrDate } from "../dates";
import { EnuygunMcpClient } from "../mcp/enuygun";
import type {
  ConditionalDiscount,
  FlightLeg,
  Offer,
  SourceReport,
} from "../types";
import {
  AIRLINES,
  airlineByIata,
  isPureCarrierOffer,
  toAirlineViaEnuygunOffer,
} from "./airlines";

const AIRLINE_NAMES: Record<string, string> = {
  PC: "Pegasus",
  VF: "AJet",
  TK: "Türk Hava Yolları",
  XQ: "SunExpress",
  XC: "Corendon",
};

interface EnuygunPriceBreakdown {
  total: number;
  currency: string;
  discount?: number;
  badges?: unknown[];
  formatted_price?: string;
}

interface EnuygunSegment {
  departure_datetime: { date: string; time: string };
  arrival_datetime: { date: string; time: string };
  flight_number: string;
  origin: string;
  destination: string;
  marketing_airline: string;
  operating_airline?: string;
  duration: { total_minutes: number };
}

interface EnuygunFlight {
  enuid: string;
  price_breakdown: EnuygunPriceBreakdown;
  infos: {
    duration: { total_minutes: number };
    is_promo?: number;
    baggage_info?: {
      carryOn?: { display_baggage?: string };
      firstBaggageCollection?: Array<{ display_baggage?: string }>;
    };
  };
  provider_packages?: Array<{ name?: string }>;
  segments: EnuygunSegment[];
  booking_provider?: string;
}

interface EnuygunSearchPayload {
  success: boolean;
  data?: {
    flights: { departure: EnuygunFlight[]; return?: EnuygunFlight[] };
    search_url?: string;
    short_search_url?: string;
    airlines?: Array<{ code: string; name: string }>;
  };
  message?: string;
}

interface AllocatePayload {
  success: boolean;
  data?: { deep_link_url?: string };
}

export const ENUYGUN_SOURCE: SourceReport = {
  id: "enuygun",
  name: "ENUYGUN",
  priority: 10,
  status: "working",
  realPriceVerified: true,
  passengerBaggageReadable: true,
  limitations: [
    "Resmi Wingie/ENUYGUN MCP (mcp.enuygun.com) üzerinden okunur.",
    "Gidiş-dönüş araması: seçilen gidiş + dönüş standart fiyatları (aynı RT oturumu).",
    "Koşullu indirimler ayrı etiketlenir.",
  ],
};

export async function searchEnuygunRoundTrip(params: {
  originCode: string;
  destinationCode: string;
  departIso: string;
  returnIso: string;
  adults?: number;
  topCombosPerPair?: number;
  airlinePurePerCarrier?: number;
}): Promise<{
  offers: Offer[];
  airlineOffers: Offer[];
  searchUrl?: string;
  carriersSeen: string[];
}> {
  const client = new EnuygunMcpClient();
  await client.initialize();

  const origin = enuygunPlaceName(params.originCode);
  const destination = enuygunPlaceName(params.destinationCode);
  const departure_date = toTrDate(params.departIso);
  const return_date = toTrDate(params.returnIso);

  const payload = await client.callTool<EnuygunSearchPayload>("flight_search", {
    origin,
    destination,
    departure_date,
    return_date,
    adults: params.adults ?? 1,
    cabin_class: "ECONOMY",
  });

  if (!payload.success || !payload.data) {
    throw new Error(payload.message || "ENUYGUN arama başarısız");
  }

  const airlineNames = new Map(
    (payload.data.airlines ?? []).map((a) => [a.code, a.name]),
  );
  for (const [k, v] of Object.entries(AIRLINE_NAMES)) {
    if (!airlineNames.has(k)) airlineNames.set(k, v);
  }

  const departures = payload.data.flights.departure ?? [];
  const returns = payload.data.flights.return ?? [];
  const carriersSeen = [
    ...new Set([
      ...departures.map((f) => f.segments[0]?.marketing_airline).filter(Boolean),
      ...returns.map((f) => f.segments[0]?.marketing_airline).filter(Boolean),
      ...(payload.data.airlines ?? []).map((a) => a.code),
    ]),
  ] as string[];

  if (!departures.length || !returns.length) {
    return {
      offers: [],
      airlineOffers: [],
      searchUrl: payload.data.search_url,
      carriersSeen,
    };
  }

  type Combo = { total: number; dep: EnuygunFlight; ret: EnuygunFlight };
  const allCombos: Combo[] = [];
  for (const dep of departures) {
    for (const ret of returns) {
      allCombos.push({
        total: dep.price_breakdown.total + ret.price_breakdown.total,
        dep,
        ret,
      });
    }
  }
  allCombos.sort((a, b) => a.total - b.total);

  const topGeneral = allCombos.slice(0, params.topCombosPerPair ?? 5);
  const offers: Offer[] = [];
  for (const c of topGeneral) {
    offers.push(
      await comboToOffer(
        client,
        c,
        params,
        payload.data,
        airlineNames,
        "enuygun",
        true,
      ),
    );
  }

  // Pure-carrier RT combos for priority airlines (still from same RT search).
  const airlineOffers: Offer[] = [];
  const per = params.airlinePurePerCarrier ?? 2;
  for (const airline of AIRLINES) {
    const pure = allCombos
      .filter(
        (c) =>
          c.dep.segments[0]?.marketing_airline === airline.iata &&
          c.ret.segments[0]?.marketing_airline === airline.iata,
      )
      .slice(0, per);
    for (const c of pure) {
      // Reuse allocate from identical general offer when present; else search URL.
      const existing = offers.find(
        (o) =>
          o.outbound.flightNumber ===
            c.dep.segments.map((s) => s.flight_number).join(" + ") &&
          o.inbound.flightNumber ===
            c.ret.segments.map((s) => s.flight_number).join(" + ") &&
          o.totalPriceTry === c.total,
      );
      const base = existing
        ? { ...existing }
        : await comboToOffer(
            client,
            c,
            params,
            payload.data,
            airlineNames,
            "enuygun",
            false,
          );
      airlineOffers.push(toAirlineViaEnuygunOffer(base, airline));
    }
  }

  return {
    offers,
    airlineOffers,
    searchUrl: payload.data.search_url,
    carriersSeen,
  };
}

async function comboToOffer(
  client: EnuygunMcpClient,
  c: { total: number; dep: EnuygunFlight; ret: EnuygunFlight },
  params: {
    originCode: string;
    destinationCode: string;
    departIso: string;
    returnIso: string;
    adults?: number;
  },
  data: NonNullable<EnuygunSearchPayload["data"]>,
  airlineNames: Map<string, string>,
  sourceId: string,
  allocate: boolean,
): Promise<Offer> {
  let bookingUrl =
    data.short_search_url || data.search_url || "https://www.enuygun.com/ucak-bileti/";
  if (allocate) {
    try {
      const alloc = await client.callTool<AllocatePayload>("flight_allocate", {
        flight_ids: [c.dep.enuid, c.ret.enuid],
      });
      if (alloc.success && alloc.data?.deep_link_url) {
        bookingUrl = alloc.data.deep_link_url;
      }
    } catch {
      // keep search URL
    }
  }

  const outbound = toLeg(c.dep, airlineNames);
  const inbound = toLeg(c.ret, airlineNames);
  const discounts = [
    ...extractDiscounts(c.dep, "Gidiş"),
    ...extractDiscounts(c.ret, "Dönüş"),
  ];
  const outAirline = airlineByIata(outbound.airlineCode);
  const inAirline = airlineByIata(inbound.airlineCode);

  return {
    id: `${sourceId}:${c.dep.enuid}|${c.ret.enuid}`,
    sourceId,
    sourceName: "ENUYGUN",
    totalPriceTry: c.total,
    currency: "TRY",
    priceKind: discounts.length ? "conditional" : "standard",
    conditionalDiscounts: discounts,
    outbound,
    inbound,
    stayDays: stayDaysBetween(params.departIso, params.returnIso),
    bookingUrl,
    searchUrl: data.search_url,
    verifiedAt: new Date().toISOString(),
    notes: [
      "Fiyat ENUYGUN MCP canlı gidiş-dönüş aramasından doğrulandı.",
      `Yolcu: ${params.adults ?? 1} yetişkin · Ekonomi`,
      outAirline && inAirline && outAirline.iata === inAirline.iata
        ? `Saf ${outAirline.name} gidiş+dönüş.`
        : `Gidiş ${outbound.airlineName} · Dönüş ${inbound.airlineName}.`,
    ],
  };
}

function toLeg(
  flight: EnuygunFlight,
  airlineNames: Map<string, string>,
): FlightLeg {
  const segs = flight.segments;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const code = first.marketing_airline;
  return {
    flightNumber: segs.map((s) => s.flight_number).join(" + "),
    airlineCode: code,
    airlineName:
      airlineNames.get(code) || AIRLINE_NAMES[code] || flight.booking_provider || code,
    origin: first.origin,
    destination: last.destination,
    departAt: fromTrDateTime(
      first.departure_datetime.date,
      first.departure_datetime.time,
    ),
    arriveAt: fromTrDateTime(
      last.arrival_datetime.date,
      last.arrival_datetime.time,
    ),
    durationMinutes: flight.infos.duration.total_minutes,
    stops: Math.max(0, segs.length - 1),
    baggageChecked:
      flight.infos.baggage_info?.firstBaggageCollection?.[0]?.display_baggage ??
      null,
    baggageCabin: flight.infos.baggage_info?.carryOn?.display_baggage ?? null,
    farePackage: flight.provider_packages?.[0]?.name ?? null,
  };
}

function extractDiscounts(
  flight: EnuygunFlight,
  legLabel: string,
): ConditionalDiscount[] {
  const out: ConditionalDiscount[] = [];
  const discount = flight.price_breakdown.discount ?? 0;
  if (discount > 0) {
    out.push({
      label: `${legLabel} indirim (koşullu olabilir)`,
      amountTry: discount,
      note: "Üyelik / kampanya / kupon koşullarını sitede doğrulayın.",
    });
  }
  if (flight.infos.is_promo) {
    out.push({
      label: `${legLabel} promosyon işareti`,
      note: "Promosyon koşulları standart fiyattan ayrı değerlendirilir.",
    });
  }
  return out;
}

export { isPureCarrierOffer };
