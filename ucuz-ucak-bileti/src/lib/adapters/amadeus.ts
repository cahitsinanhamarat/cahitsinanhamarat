import type { DatePair } from "../dates";
import { buildDeepLink } from "../deep-links";
import type { FlightOffer } from "../types";

const TOKEN_URL = "https://api.amadeus.com/v1/security/oauth2/token";
const SEARCH_URL = "https://api.amadeus.com/v2/shopping/flight-offers";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !secret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
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
): Promise<FlightOffer[]> {
  const token = await getToken();
  if (!token) return [];

  // Rate limit: en fazla 6 tarih çifti
  const limited = pairs.slice(0, 6);
  const results: FlightOffer[] = [];

  await Promise.all(
    limited.map(async (pair) => {
      try {
        const url = new URL(SEARCH_URL);
        url.searchParams.set("originLocationCode", origin.slice(0, 3));
        url.searchParams.set("destinationLocationCode", destination.slice(0, 3));
        url.searchParams.set("departureDate", pair.departure);
        url.searchParams.set("returnDate", pair.returnDate);
        url.searchParams.set("adults", "1");
        url.searchParams.set("currencyCode", "TRY");
        url.searchParams.set("max", "5");

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: AmadeusOffer[] };
        for (const offer of json.data ?? []) {
          const outSeg = offer.itineraries[0]?.segments?.[0];
          const inSegs = offer.itineraries[1]?.segments;
          const inSeg = inSegs?.[0];
          const inLast = inSegs?.[inSegs.length - 1];
          if (!outSeg || !inSeg || !inLast) continue;

          const outLast =
            offer.itineraries[0].segments[
              offer.itineraries[0].segments.length - 1
            ];

          results.push({
            id: `amadeus-${offer.id}-${pair.departure}`,
            source: "Amadeus (meta)",
            sourcePriority: 50, // onaylı listeden sonra, ama canlı fiyat
            price: Math.round(parseFloat(offer.price.total)),
            currency: "TRY",
            airline:
              offer.validatingAirlineCodes?.[0] ?? outSeg.carrierCode ?? "—",
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
            mode: "live",
          });
        }
      } catch {
        // kısmi hata — diğer çiftler devam
      }
    })
  );

  return results;
}
