import type { DatePair } from "../dates";
import { buildDeepLink } from "../deep-links";
import { airlineName, toAmadeusAirport } from "../airlines";
import type { FlightOffer } from "../types";
import type { AdapterResult } from "./types";

function amadeusHosts(): { token: string; search: string } {
  // test = self-service sandbox (ücretsiz kayıt sonrası); production = canlı
  const env = (process.env.AMADEUS_ENV || "test").toLowerCase();
  if (env === "production" || env === "prod") {
    return {
      token: "https://api.amadeus.com/v1/security/oauth2/token",
      search: "https://api.amadeus.com/v2/shopping/flight-offers",
    };
  }
  return {
    token: "https://test.api.amadeus.com/v1/security/oauth2/token",
    search: "https://test.api.amadeus.com/v2/shopping/flight-offers",
  };
}

let cachedToken: { value: string; expiresAt: number; env: string } | null =
  null;

async function getToken(): Promise<{ token: string | null; error?: string }> {
  const id = process.env.AMADEUS_CLIENT_ID?.trim();
  const secret = process.env.AMADEUS_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    return { token: null, error: "AMADEUS_CLIENT_ID/SECRET eksik" };
  }

  const env = (process.env.AMADEUS_ENV || "test").toLowerCase();
  if (
    cachedToken &&
    cachedToken.env === env &&
    Date.now() < cachedToken.expiresAt - 60_000
  ) {
    return { token: cachedToken.value };
  }

  const { token: tokenUrl } = amadeusHosts();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
  });

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        token: null,
        error: `Amadeus token ${res.status}: ${text.slice(0, 180)}`,
      };
    }
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      env,
    };
    return { token: cachedToken.value };
  } catch (e) {
    return {
      token: null,
      error: e instanceof Error ? e.message : "Amadeus token hatası",
    };
  }
}

type AmadeusOffer = {
  id: string;
  price: { total: string; currency: string };
  validatingAirlineCodes?: string[];
  itineraries: {
    duration: string;
    segments: {
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
    }[];
  }[];
};

/** Amadeus meta canlı fiyat (onaylı 19’a ek katman). */
export async function searchAmadeus(
  origin: string,
  destination: string,
  pairs: DatePair[]
): Promise<AdapterResult> {
  const { token, error } = await getToken();
  if (!token) {
    return { source: "amadeus", offers: [], ok: false, error: error || "token yok" };
  }

  const from = toAmadeusAirport(origin);
  const to = toAmadeusAirport(destination);
  const limited = pairs.slice(0, 6);
  const results: FlightOffer[] = [];
  const errors: string[] = [];
  const { search: searchUrl } = amadeusHosts();

  await Promise.all(
    limited.map(async (pair) => {
      try {
        const url = new URL(searchUrl);
        url.searchParams.set("originLocationCode", from);
        url.searchParams.set("destinationLocationCode", to);
        url.searchParams.set("departureDate", pair.departure);
        url.searchParams.set("returnDate", pair.returnDate);
        url.searchParams.set("adults", "1");
        url.searchParams.set("currencyCode", "TRY");
        url.searchParams.set("max", "5");

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(14_000),
        });
        if (!res.ok) {
          errors.push(`${pair.departure}: HTTP ${res.status}`);
          return;
        }
        const json = (await res.json()) as { data?: AmadeusOffer[] };
        for (const offer of json.data ?? []) {
          const outSegs = offer.itineraries[0]?.segments;
          const inSegs = offer.itineraries[1]?.segments;
          if (!outSegs?.length || !inSegs?.length) continue;
          const outSeg = outSegs[0];
          const outLast = outSegs[outSegs.length - 1];
          const inSeg = inSegs[0];
          const inLast = inSegs[inSegs.length - 1];

          results.push({
            id: `amadeus-${offer.id}-${pair.departure}`,
            source: "Amadeus (meta)",
            sourcePriority: 50,
            price: Math.round(parseFloat(offer.price.total)),
            currency: "TRY",
            airline: airlineName(
              offer.validatingAirlineCodes?.[0] ?? outSeg.carrierCode
            ),
            outbound: {
              departure: outSeg.departure.at,
              arrival: outLast.arrival.at,
              from: outSeg.departure.iataCode,
              to: outLast.arrival.iataCode,
            },
            inbound: {
              departure: inSeg.departure.at,
              arrival: inLast.arrival.at,
              from: inSeg.departure.iataCode,
              to: inLast.arrival.iataCode,
            },
            stayDays: pair.stayDays,
            purchaseUrl: buildDeepLink("skyscanner", {
              origin,
              destination,
              pair,
            }),
            stops: "unknown" as const,

            stopCount: null,

            mode: "live",
          });
        }
      } catch (e) {
        errors.push(
          `${pair.departure}: ${e instanceof Error ? e.message : "hata"}`
        );
      }
    })
  );

  return {
    source: "amadeus",
    offers: results,
    ok: results.length > 0 || errors.length === 0,
    error: errors.length ? errors.slice(0, 3).join("; ") : undefined,
    meta: { from, to, pairsTried: limited.length, env: process.env.AMADEUS_ENV || "test" },
  };
}
