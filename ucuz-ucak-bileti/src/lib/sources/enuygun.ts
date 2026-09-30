import { enuygunPlaceName, resolveMemberIatas } from "../airports";
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

type SearchVariant = {
  origin: string;
  destination: string;
  direct_flight?: boolean;
  label: string;
};

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
    "THY/AJet için ek IATA ve aktarmasız varyantlar birleştirilir; OW+OW yok.",
    "Koşullu indirimler ayrı etiketlenir.",
  ],
};

/** Build search variants so THY (IST) and AJet (SAW/city) both surface. */
export function buildEnuygunVariants(
  originCode: string,
  destinationCode: string,
): SearchVariant[] {
  const originName = enuygunPlaceName(originCode);
  const destName = enuygunPlaceName(destinationCode);
  const originMembers = resolveMemberIatas(originCode);
  const destMembers = resolveMemberIatas(destinationCode);
  const destIata =
    destinationCode.length === 3 && !getCityKind(destinationCode)
      ? destinationCode.toUpperCase()
      : destMembers[0];

  const variants: SearchVariant[] = [
    {
      origin: originName,
      destination: destName,
      label: "city-economy",
    },
    {
      origin: originName,
      destination: destName,
      direct_flight: true,
      label: "city-direct",
    },
  ];

  // THY hubs from IST — IATA→IATA pulls thy_ndc RT that city-metro search buries.
  if (originMembers.includes("IST") || originCode.toUpperCase() === "IST") {
    variants.push({
      origin: "IST",
      destination: destIata || destName,
      label: "ist-iata",
    });
    variants.push({
      origin: "IST",
      destination: destIata || destName,
      direct_flight: true,
      label: "ist-iata-direct",
    });
  }

  // AJet / LCC often priced on SAW.
  if (originMembers.includes("SAW") || originCode.toUpperCase() === "SAW") {
    variants.push({
      origin: "SAW",
      destination: destIata || destName,
      label: "saw-iata",
    });
  }

  // Dedupe identical origin/dest/direct
  const seen = new Set<string>();
  return variants.filter((v) => {
    const key = `${v.origin}|${v.destination}|${v.direct_flight ? 1 : 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCityKind(code: string): boolean {
  // city metro codes used in our data
  return ["ISTA", "LON", "PAR", "NYC", "ROM", "MIL", "TYO", "OSA", "BJS", "CHI", "WAS", "MOW", "SEL", "YTO", "SAO", "RIO", "BUE", "QSF"].includes(
    code.toUpperCase(),
  );
}

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

  const departure_date = toTrDate(params.departIso);
  const return_date = toTrDate(params.returnIso);
  const adults = params.adults ?? 1;
  const variants = buildEnuygunVariants(
    params.originCode,
    params.destinationCode,
  );

  const airlineNames = new Map<string, string>(Object.entries(AIRLINE_NAMES));
  const carriersSeen = new Set<string>();
  let primaryData: NonNullable<EnuygunSearchPayload["data"]> | null = null;

  type Combo = {
    total: number;
    dep: EnuygunFlight;
    ret: EnuygunFlight;
    data: NonNullable<EnuygunSearchPayload["data"]>;
    variant: string;
  };

  const generalCombos: Combo[] = [];
  const airlineCombosByCarrier = new Map<string, Combo[]>();

  for (const variant of variants) {
    const args: Record<string, unknown> = {
      origin: variant.origin,
      destination: variant.destination,
      departure_date,
      return_date,
      adults,
      cabin_class: "ECONOMY",
    };
    if (variant.direct_flight) args.direct_flight = true;

    let payload: EnuygunSearchPayload;
    try {
      payload = await client.callTool<EnuygunSearchPayload>(
        "flight_search",
        args,
      );
    } catch {
      continue;
    }
    if (!payload.success || !payload.data) continue;
    if (!primaryData) primaryData = payload.data;

    for (const a of payload.data.airlines ?? []) {
      airlineNames.set(a.code, a.name);
    }

    const departures = payload.data.flights.departure ?? [];
    const returns = payload.data.flights.return ?? [];
    for (const f of [...departures, ...returns]) {
      const code = f.segments[0]?.marketing_airline;
      if (code) carriersSeen.add(code);
    }
    if (!departures.length || !returns.length) continue;

    const combos: Combo[] = [];
    for (const dep of departures) {
      for (const ret of returns) {
        combos.push({
          total: dep.price_breakdown.total + ret.price_breakdown.total,
          dep,
          ret,
          data: payload.data,
          variant: variant.label,
        });
      }
    }
    combos.sort((a, b) => a.total - b.total);

    // Cheapest overall from city-economy (and city-direct as backup)
    if (variant.label === "city-economy" || generalCombos.length === 0) {
      generalCombos.push(...combos.slice(0, params.topCombosPerPair ?? 4));
    }

    // Pure-carrier combos only within THIS RT response (never cross-search OW+OW).
    for (const airline of AIRLINES) {
      const pure = combos.filter(
        (c) =>
          c.dep.segments[0]?.marketing_airline === airline.iata &&
          c.ret.segments[0]?.marketing_airline === airline.iata,
      );
      if (!pure.length) continue;
      const list = airlineCombosByCarrier.get(airline.iata) || [];
      list.push(...pure);
      airlineCombosByCarrier.set(airline.iata, list);
    }
  }

  if (!primaryData && generalCombos.length === 0) {
    return {
      offers: [],
      airlineOffers: [],
      carriersSeen: [...carriersSeen],
    };
  }

  generalCombos.sort((a, b) => a.total - b.total);
  const topGeneral = dedupeCombos(generalCombos).slice(
    0,
    params.topCombosPerPair ?? 4,
  );

  const offers: Offer[] = [];
  for (const c of topGeneral) {
    offers.push(
      await comboToOffer(
        client,
        c,
        params,
        c.data,
        airlineNames,
        "enuygun",
        true,
      ),
    );
  }

  const per = params.airlinePurePerCarrier ?? 2;
  const airlineOffers: Offer[] = [];
  for (const airline of AIRLINES) {
    const raw = airlineCombosByCarrier.get(airline.iata) || [];
    // Prefer NDC providers when present (thy_ndc, anadolujet, pegasus_ndc*).
    raw.sort((a, b) => {
      const score = (c: Combo) => {
        const p = `${c.dep.booking_provider || ""} ${c.ret.booking_provider || ""}`;
        let s = 0;
        if (p.includes("thy_ndc")) s += 3;
        if (p.includes("anadolujet")) s += 2;
        if (p.includes("pegasus_ndc")) s += 2;
        return s;
      };
      return b.total === a.total
        ? score(b) - score(a)
        : a.total - b.total || score(b) - score(a);
    });
    const pure = dedupeCombos(raw).slice(0, per);
    for (const c of pure) {
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
            c.data,
            airlineNames,
            "enuygun",
            true,
          );
      const labeled = toAirlineViaEnuygunOffer(base, airline);
      if (airline.iata === "TK") {
        labeled.notes = [
          ...(labeled.notes || []),
          "THY RT: aynı ENUYGUN gidiş-dönüş aramasından TK+TK (iki ayrı OW toplamı değil).",
          c.dep.booking_provider === "thy_ndc" ||
          c.ret.booking_provider === "thy_ndc"
            ? "Kaynak sağlayıcı: thy_ndc"
            : `Sağlayıcı: ${c.dep.booking_provider || "?"}`,
        ];
      }
      airlineOffers.push(labeled);
    }
  }

  return {
    offers,
    airlineOffers,
    searchUrl: primaryData?.search_url,
    carriersSeen: [...carriersSeen],
  };
}

function dedupeCombos<
  T extends { total: number; dep: EnuygunFlight; ret: EnuygunFlight },
>(combos: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const c of combos) {
    const key = `${c.dep.enuid}|${c.ret.enuid}|${c.total}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
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
    data.short_search_url ||
    data.search_url ||
    "https://www.enuygun.com/ucak-bileti/";
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
      airlineNames.get(code) ||
      AIRLINE_NAMES[code] ||
      flight.booking_provider ||
      code,
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
