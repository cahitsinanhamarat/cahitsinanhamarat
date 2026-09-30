import {
  getAirport,
  resolveMemberIatas,
  skyscannerPlaceSlug,
} from "../airports";
import { stayDaysBetween } from "../dates";
import type { FlightLeg, Offer, SourceReport } from "../types";

const CREATE_URL =
  "https://partners.api.skyscanner.net/apiservices/v3/flights/live/search/create";

export function skyscannerBaseReport(): SourceReport {
  const hasKey = Boolean(process.env.SKYSCANNER_API_KEY?.trim());
  return {
    id: "skyscanner",
    name: "Skyscanner TR",
    priority: 2,
    status: hasKey ? "partial" : "inaccessible",
    realPriceVerified: false,
    passengerBaggageReadable: false,
    limitations: [
      "Resmi Flights Live Prices API partner başvurusu + x-api-key ister (ücretsiz self-serve yok).",
      "Bu ortamda API anahtarı yok → create endpoint 401 Invalid API key.",
      "skyscanner.com.tr sunucu/curl istekleri CAPTCHA (px-captcha) ile engelleniyor; CAPTCHA bypass yok.",
      "İnsan tarayıcısında site açılıyor ve TRY fiyatlar görünüyor — bu, uygulamaya otomatik doğrulanmış fiyat entegrasyonu değildir.",
      "Travel Widgets arama başlatır / siteye yönlendirir; sıralanabilir doğrulanmış fiyat okuma sayılmaz (link-only ≠ tamamlandı).",
      "Uygulama Skyscanner’a hard-dependent değil; ENUYGUN çalışmaya devam eder.",
    ],
    lastTestedAt: new Date().toISOString(),
    lastTestRoute: "partners.api create (no/invalid key) + site CAPTCHA probe + browser manual IST→AMS",
  };
}

/** Discovery URL only — never treat as verified price result. */
export function skyscannerOpenUrl(params: {
  originCode: string;
  destinationCode: string;
  departIso: string;
  returnIso: string;
}): string {
  const o = skyscannerPlaceSlug(params.originCode);
  const d = skyscannerPlaceSlug(params.destinationCode);
  const dep = params.departIso.replace(/-/g, "").slice(2); // YYMMDD
  const ret = params.returnIso.replace(/-/g, "").slice(2);
  return `https://www.skyscanner.com.tr/ulasim/ucuslar/${o}/${d}/${dep}/${ret}/?adultsv2=1&cabinclass=economy&rtn=1`;
}

/**
 * Attempt official partner Live Prices API when SKYSCANNER_API_KEY is set.
 * Without a key: returns inaccessible — no scrape, no fake prices.
 */
export async function searchSkyscannerRoundTrip(params: {
  originCode: string;
  destinationCode: string;
  departIso: string;
  returnIso: string;
  adults?: number;
}): Promise<{
  offers: Offer[];
  report: SourceReport;
  error?: string;
}> {
  const key = process.env.SKYSCANNER_API_KEY?.trim();
  const base = skyscannerBaseReport();
  const route = `${params.originCode}→${params.destinationCode} ${params.departIso}–${params.returnIso}`;

  if (!key) {
    return {
      offers: [],
      report: {
        ...base,
        status: "inaccessible",
        realPriceVerified: false,
        lastTestedAt: new Date().toISOString(),
        lastTestRoute: route,
        limitations: [
          ...base.limitations,
          "SKYSCANNER_API_KEY tanımlı değil — doğrulanmış fiyat okunamadı.",
        ],
      },
      error:
        "Skyscanner partner API anahtarı yok; CAPTCHA engeli nedeniyle otomatik fiyat okunamadı.",
    };
  }

  try {
    const originIata = resolveMemberIatas(params.originCode)[0];
    const destIata = resolveMemberIatas(params.destinationCode)[0];
    const [dy, dm, dd] = params.departIso.split("-").map(Number);
    const [ry, rm, rd] = params.returnIso.split("-").map(Number);

    const createRes = await fetch(CREATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({
        query: {
          market: "TR",
          locale: "tr-TR",
          currency: "TRY",
          queryLegs: [
            {
              originPlaceId: { iata: originIata },
              destinationPlaceId: { iata: destIata },
              date: { year: dy, month: dm, day: dd },
            },
            {
              originPlaceId: { iata: destIata },
              destinationPlaceId: { iata: originIata },
              date: { year: ry, month: rm, day: rd },
            },
          ],
          adults: params.adults ?? 1,
          cabinClass: "CABIN_CLASS_ECONOMY",
        },
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      return {
        offers: [],
        report: {
          ...base,
          status: "inaccessible",
          realPriceVerified: false,
          lastTestedAt: new Date().toISOString(),
          lastTestRoute: route,
          limitations: [
            ...base.limitations,
            `Live Prices create HTTP ${createRes.status}: ${text.slice(0, 180)}`,
          ],
        },
        error: `Skyscanner API ${createRes.status}`,
      };
    }

    const payload = (await createRes.json()) as {
      sessionToken?: string;
      content?: {
        results?: {
          itineraries?: Record<
            string,
            {
              price?: { amount?: string; unit?: string };
              legIds?: string[];
            }
          >;
          legs?: Record<
            string,
            {
              originPlaceId?: string;
              destinationPlaceId?: string;
              departure?: string;
              arrival?: string;
              durationInMinutes?: number;
              stopCount?: number;
              marketingCarrierIds?: string[];
            }
          >;
        };
      };
    };

    const session = payload.sessionToken;
    let results = payload.content?.results;
    if (session) {
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const poll = await fetch(
          `https://partners.api.skyscanner.net/apiservices/v3/flights/live/search/poll/${session}`,
          { method: "POST", headers: { "x-api-key": key } },
        );
        if (!poll.ok) break;
        const body = (await poll.json()) as typeof payload;
        results = body.content?.results ?? results;
        const status = (body as { status?: string }).status;
        if (status === "RESULT_STATUS_COMPLETE") break;
      }
    }

    const itineraries = results?.itineraries || {};
    const legs = results?.legs || {};
    const offers: Offer[] = [];

    for (const [id, it] of Object.entries(itineraries)) {
      const amountRaw = it.price?.amount;
      if (!amountRaw) continue;
      // Skyscanner often returns milli-units; prefer integer TRY if unit missing.
      let total = Number(amountRaw);
      if (!Number.isFinite(total) || total <= 0) continue;
      if (total > 1_000_000) total = Math.round(total / 1000);

      const legIds = it.legIds || [];
      if (legIds.length < 2) continue;
      const outLeg = legs[legIds[0]];
      const inLeg = legs[legIds[1]];
      if (!outLeg || !inLeg) continue;

      const outbound = mapApiLeg(outLeg, params.originCode, params.destinationCode);
      const inbound = mapApiLeg(inLeg, params.destinationCode, params.originCode);
      const bookingUrl = skyscannerOpenUrl(params);

      offers.push({
        id: `skyscanner:${id}`,
        sourceId: "skyscanner",
        sourceName: "Skyscanner",
        totalPriceTry: Math.round(total),
        currency: "TRY",
        priceKind: "standard",
        conditionalDiscounts: [],
        outbound,
        inbound,
        stayDays: stayDaysBetween(params.departIso, params.returnIso),
        bookingUrl,
        searchUrl: bookingUrl,
        verifiedAt: new Date().toISOString(),
        notes: [
          "Fiyat Skyscanner Flights Live Prices partner API’sinden okundu.",
          `Yolcu: ${params.adults ?? 1} yetişkin · Ekonomi`,
        ],
      });
    }

    offers.sort((a, b) => a.totalPriceTry - b.totalPriceTry);
    const top = offers.slice(0, 8);
    const verified = top.length > 0;

    return {
      offers: top,
      report: {
        ...base,
        status: verified ? "working" : "partial",
        realPriceVerified: verified,
        passengerBaggageReadable: false,
        lastTestedAt: new Date().toISOString(),
        lastTestRoute: route,
        limitations: verified
          ? [
              "Partner API anahtarı ile Live Prices kullanıldı.",
              "Bagaj detayı bu yanıtta sınırlı olabilir — rezervasyonda doğrulayın.",
            ]
          : [
              ...base.limitations,
              "API yanıtında sıralanabilir itinerary fiyatı yok / boş.",
            ],
      },
    };
  } catch (e) {
    return {
      offers: [],
      report: {
        ...base,
        status: "inaccessible",
        realPriceVerified: false,
        lastTestedAt: new Date().toISOString(),
        lastTestRoute: route,
        limitations: [
          ...base.limitations,
          e instanceof Error ? e.message : String(e),
        ],
      },
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function mapApiLeg(
  leg: {
    departure?: string;
    arrival?: string;
    durationInMinutes?: number;
    stopCount?: number;
    marketingCarrierIds?: string[];
  },
  fallbackOrigin: string,
  fallbackDest: string,
): FlightLeg {
  const carrier = (leg.marketingCarrierIds || [])[0] || "?";
  const o = getAirport(fallbackOrigin);
  const d = getAirport(fallbackDest);
  return {
    flightNumber: carrier,
    airlineCode: carrier.slice(0, 2).toUpperCase(),
    airlineName: carrier,
    origin: o?.kind === "city" ? o.members?.[0] || fallbackOrigin : fallbackOrigin,
    destination:
      d?.kind === "city" ? d.members?.[0] || fallbackDest : fallbackDest,
    departAt: (leg.departure || "").slice(0, 16),
    arriveAt: (leg.arrival || "").slice(0, 16),
    durationMinutes: leg.durationInMinutes || 0,
    stops: leg.stopCount || 0,
    baggageChecked: null,
    baggageCabin: null,
    farePackage: null,
  };
}
