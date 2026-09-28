import type { DatePair } from "./dates";
import { APPROVED_SOURCES } from "./sources";
import type { FlightOffer } from "./types";

export type DeepLinkParams = {
  origin: string;
  destination: string;
  pair: DatePair;
};

function ymdCompact(ymd: string): string {
  return ymd.replace(/-/g, "");
}

/** Kaynak başına gidiş-dönüş arama deep-link’i (API yoksa link-out). */
export function buildDeepLink(
  sourceId: string,
  p: DeepLinkParams
): string {
  const { origin: o, destination: d, pair } = p;
  const dep = pair.departure;
  const ret = pair.returnDate;
  const depC = ymdCompact(dep);
  const retC = ymdCompact(ret);

  switch (sourceId) {
    case "skyscanner":
      return `https://www.skyscanner.com.tr/transport/flights/${o.toLowerCase()}/${d.toLowerCase()}/${depC}/${retC}/?adults=1&cabinclass=economy&rtn=1&preferdirects=false`;
    case "enuygun":
      return `https://www.enuygun.com/ucak-bileti/arama/${o}-${d}/?gidis=${dep}&donus=${ret}&yetiskin=1&sinif=ekonomi`;
    case "kayak":
      return `https://www.kayak.com.tr/flights/${o}-${d}/${dep}/${ret}?sort=bestflight_a`;
    case "google-flights":
      return `https://www.google.com/travel/flights?hl=tr&curr=TRY#flt=${o}.${d}.${dep}*${d}.${o}.${ret}`;
    case "turna":
      return `https://www.turna.com/ucak-bileti/${o.toLowerCase()}-${d.toLowerCase()}?departureDate=${dep}&returnDate=${ret}&adult=1`;
    case "ucuzabilet":
      return `https://www.ucuzabilet.com/ucak-bileti/${o}-${d}?gidistar=${dep}&donustar=${ret}&yetiskin=1`;
    case "biletall":
      return `https://www.biletall.com/ucak-bileti/${o}-${d}?gidis=${dep}&donus=${ret}&yetiskin=1`;
    case "obilet":
      return `https://www.obilet.com/ucak-bileti?nereden=${o}&nereye=${d}&gidis=${dep}&donus=${ret}&yetiskin=1`;
    case "kiwi":
      return `https://www.kiwi.com/tr/search/results/${o}-${d}/${dep}/${ret}?adults=1&currency=try`;
    case "momondo":
      return `https://www.momondo.com/flight-search/${o}-${d}/${dep}/${ret}?sort=bestflight_a`;
    case "thy":
      return `https://www.turkishairlines.com/tr-int/ucak-bileti/${o.toLowerCase()}-${d.toLowerCase()}/?outbound=${dep}&inbound=${ret}&adult=1&cabin=ECONOMY`;
    case "pegasus":
      return `https://www.flypgs.com/ucak-bileti?departurePort=${o}&arrivalPort=${d}&departureDate=${dep}&returnDate=${ret}&adultCount=1`;
    case "ajet":
      return `https://www.ajet.com/tr/ucak-bileti?origin=${o}&destination=${d}&departureDate=${dep}&returnDate=${ret}&adult=1`;
    case "sunexpress":
      return `https://www.sunexpress.com/tr/ucak-bileti/?origin=${o}&destination=${d}&outbound=${dep}&inbound=${ret}&adults=1`;
    case "corendon":
      return `https://www.corendonairlines.com/tr/ucak-bileti?from=${o}&to=${d}&departure=${dep}&return=${ret}&adults=1`;
    case "expedia":
      return `https://www.expedia.com/Flights-Search?trip=roundtrip&leg1=from:${o},to:${d},departure:${dep}TANYT&leg2=from:${d},to:${o},departure:${ret}TANYT&passengers=adults:1&mode=search`;
    case "booking":
      return `https://www.booking.com/flights/index.html?type=ROUNDTRIP&from=${o}&to=${d}&depart=${dep}&return=${ret}&adults=1`;
    case "trip":
      return `https://www.trip.com/flights/${o.toLowerCase()}-to-${d.toLowerCase()}/roundtrip-${o.toLowerCase()}-${d.toLowerCase()}/?dcity=${o}&acity=${d}&ddate=${dep}&rdate=${ret}&adult=1`;
    case "edreams":
      return `https://www.edreams.com/travel/#results/type=R;from=${o};to=${d};dep=${dep};ret=${ret};adults=1`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(`${o} ${d} uçuş ${dep} ${ret}`)}`;
  }
}

/** Her onaylı kaynak için tek bir tipik tarih çiftiyle link-out teklifi. */
export function buildLinkOutOffers(
  origin: string,
  destination: string,
  pair: DatePair,
  mode: "link-out" | "demo" = "link-out"
): FlightOffer[] {
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
    purchaseUrl: buildDeepLink(src.id, { origin, destination, pair }),
    mode,
  }));
}
