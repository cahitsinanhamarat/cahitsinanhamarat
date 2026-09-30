import { enuygunPlaceName } from "../airports";
import { fromTrDateTime, stayDaysBetween, toTrDate } from "../dates";
import { EnuygunMcpClient } from "../mcp/enuygun";
import type {
  ConditionalDiscount,
  FlightLeg,
  Offer,
  SourceReport,
} from "../types";

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
  priority: 1,
  status: "working",
  realPriceVerified: true,
  passengerBaggageReadable: true,
  limitations: [
    "Resmi Wingie/ENUYGUN MCP (mcp.enuygun.com) üzerinden okunur.",
    "Gidiş ve dönüş ayrı listelenir; toplam = seçilen gidiş + dönüş standart fiyatları.",
    "Koşullu indirimler (üye/banka/kupon) varsa ayrı etiketlenir; sıralama standart toplam üzerinden yapılır.",
  ],
};

export async function searchEnuygunRoundTrip(params: {
  originCode: string;
  destinationCode: string;
  departIso: string;
  returnIso: string;
  adults?: number;
  topCombosPerPair?: number;
}): Promise<{ offers: Offer[]; searchUrl?: string }> {
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
  const departures = payload.data.flights.departure ?? [];
  const returns = payload.data.flights.return ?? [];
  if (!departures.length || !returns.length) {
    return { offers: [], searchUrl: payload.data.search_url };
  }

  type Combo = { total: number; dep: EnuygunFlight; ret: EnuygunFlight };
  const combos: Combo[] = [];
  for (const dep of departures) {
    for (const ret of returns) {
      combos.push({
        total: dep.price_breakdown.total + ret.price_breakdown.total,
        dep,
        ret,
      });
    }
  }
  combos.sort((a, b) => a.total - b.total);
  const top = combos.slice(0, params.topCombosPerPair ?? 5);

  const offers: Offer[] = [];
  for (const c of top) {
    let bookingUrl =
      payload.data.short_search_url ||
      payload.data.search_url ||
      "https://www.enuygun.com/ucak-bileti/";
    try {
      const alloc = await client.callTool<AllocatePayload>("flight_allocate", {
        flight_ids: [c.dep.enuid, c.ret.enuid],
      });
      if (alloc.success && alloc.data?.deep_link_url) {
        bookingUrl = alloc.data.deep_link_url;
      }
    } catch {
      // Keep search URL fallback — still a verified price row with source link.
    }

    const outbound = toLeg(c.dep, airlineNames);
    const inbound = toLeg(c.ret, airlineNames);
    const discounts = [
      ...extractDiscounts(c.dep, "Gidiş"),
      ...extractDiscounts(c.ret, "Dönüş"),
    ];

    offers.push({
      id: `enuygun:${c.dep.enuid}|${c.ret.enuid}`,
      sourceId: "enuygun",
      sourceName: "ENUYGUN",
      totalPriceTry: c.total,
      currency: "TRY",
      priceKind: discounts.length ? "conditional" : "standard",
      conditionalDiscounts: discounts,
      outbound,
      inbound,
      stayDays: stayDaysBetween(params.departIso, params.returnIso),
      bookingUrl,
      searchUrl: payload.data.search_url,
      verifiedAt: new Date().toISOString(),
      notes: [
        "Fiyat ENUYGUN MCP canlı aramasından doğrulandı (standart kamu fiyatı).",
        `Yolcu: ${params.adults ?? 1} yetişkin · Ekonomi`,
      ],
    });
  }

  return { offers, searchUrl: payload.data.search_url };
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
