import type { Offer, SourceReport, SourceStatus } from "../types";

export type AirlineId =
  | "ajet"
  | "turkish-airlines"
  | "pegasus"
  | "sunexpress"
  | "corendon";

export interface AirlineDef {
  id: AirlineId;
  name: string;
  iata: string;
  officialUrl: string;
  priority: number;
}

export const AIRLINES: AirlineDef[] = [
  {
    id: "ajet",
    name: "AJet",
    iata: "VF",
    officialUrl: "https://ajet.com",
    priority: 1,
  },
  {
    id: "turkish-airlines",
    name: "Turkish Airlines",
    iata: "TK",
    officialUrl: "https://www.turkishairlines.com",
    priority: 2,
  },
  {
    id: "pegasus",
    name: "Pegasus",
    iata: "PC",
    officialUrl: "https://www.flypgs.com",
    priority: 3,
  },
  {
    id: "sunexpress",
    name: "SunExpress",
    iata: "XQ",
    officialUrl: "https://www.sunexpress.com",
    priority: 4,
  },
  {
    id: "corendon",
    name: "Corendon",
    iata: "XC",
    officialUrl: "https://www.corendonairlines.com",
    priority: 5,
  },
];

export function airlineByIata(code: string): AirlineDef | undefined {
  return AIRLINES.find((a) => a.iata === code.toUpperCase());
}

/** Probe direct HTTP reachability — never scrapes prices. */
export async function probeAirlineDirect(
  airline: AirlineDef,
): Promise<{ ok: boolean; httpStatus?: number; detail: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(airline.officialUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; UcuzUcakBileti/0.2; +research)",
        Accept: "text/html,application/json",
      },
    });
    clearTimeout(timer);
    const text = await res.text();
    const lower = text.slice(0, 2000).toLowerCase();
    if (
      lower.includes("just a moment") ||
      lower.includes("cf-browser-verification") ||
      lower.includes("px-captcha") ||
      lower.includes("captcha")
    ) {
      return {
        ok: false,
        httpStatus: res.status,
        detail: `HTTP ${res.status} — bot/CAPTCHA challenge (bypass yok)`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        httpStatus: res.status,
        detail: `HTTP ${res.status}`,
      };
    }
    if (text.length < 500) {
      return {
        ok: false,
        httpStatus: res.status,
        detail: `HTTP ${res.status} — çok kısa yanıt (${text.length} byte)`,
      };
    }
    return {
      ok: true,
      httpStatus: res.status,
      detail: `HTTP ${res.status} — site yanıt verdi (fiyat API’si değil)`,
    };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: `bağlantı hatası: ${msg}` };
  }
}

export function buildAirlineReport(params: {
  airline: AirlineDef;
  direct: { ok: boolean; httpStatus?: number; detail: string };
  viaEnuygunOffers: number;
  lastTestRoute?: string;
  extraLimitations?: string[];
}): SourceReport {
  const { airline, direct, viaEnuygunOffers } = params;
  const via = viaEnuygunOffers > 0;

  let status: SourceStatus;
  if (via) status = "partial"; // verified prices via ENUYGUN, not direct airline API
  else if (direct.ok) status = "partial"; // site reachable but no verified price read
  else status = "inaccessible";

  const limitations = [
    `Doğrudan resmi site: ${direct.detail}`,
    via
      ? `Doğrulanmış fiyat: ENUYGUN MCP gidiş-dönüş aramasında saf ${airline.iata}+${airline.iata} kombinasyonları (${viaEnuygunOffers} teklif). Kaynak etiketi: “${airline.name} · ENUYGUN”.`
      : `Bu aramada ENUYGUN sonuç penceresinde saf ${airline.iata}+${airline.iata} RT kombinasyonu yok.`,
    airline.id === "turkish-airlines"
      ? "THY: bağımsız iki tek yön toplamı YAPILMAZ; yalnızca aynı RT aramasından TK+TK bacakları."
      : "LCC/OTA: fiyatlar ENUYGUN RT arama bağlamından; uydurma yok.",
    "Doğrudan havayolu NDC/partner API anahtarı yok — CAPTCHA/scrape yok.",
    ...(params.extraLimitations || []),
  ];

  return {
    id: airline.id,
    name: airline.name,
    priority: airline.priority,
    status,
    realPriceVerified: via,
    passengerBaggageReadable: via,
    limitations,
    lastTestedAt: new Date().toISOString(),
    lastTestRoute: params.lastTestRoute,
  };
}

/** Relabel ENUYGUN pure-carrier RT offers as airline-via-meta sources. */
export function toAirlineViaEnuygunOffer(
  offer: Offer,
  airline: AirlineDef,
): Offer {
  return {
    ...offer,
    id: `${airline.id}:${offer.id}`,
    sourceId: airline.id,
    sourceName: `${airline.name} · ENUYGUN`,
    notes: [
      ...(offer.notes || []),
      `Doğrudan ${airline.name} API yok; fiyat ENUYGUN gidiş-dönüş aramasından doğrulandı.`,
      airline.id === "turkish-airlines"
        ? "THY RT: aynı aramadaki TK gidiş + TK dönüş (iki ayrı OW toplamı değil)."
        : `Saf ${airline.iata} gidiş + ${airline.iata} dönüş kombinasyonu.`,
    ],
  };
}

export function isPureCarrierOffer(offer: Offer, iata: string): boolean {
  const code = iata.toUpperCase();
  return (
    offer.outbound.airlineCode.toUpperCase() === code &&
    offer.inbound.airlineCode.toUpperCase() === code
  );
}
