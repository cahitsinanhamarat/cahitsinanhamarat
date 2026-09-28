import type { DatePair } from "../dates";
import { buildDeepLink } from "../deep-links";
import { airlineName } from "../airlines";
import type { FlightOffer } from "../types";
import type { AdapterResult } from "./types";

const SEARCH_URL = "https://api.tequila.kiwi.com/v2/search";

type KiwiItinerary = {
  id: string;
  price: number;
  airlines: string[];
  deep_link?: string;
  route: {
    flyFrom: string;
    flyTo: string;
    local_departure: string;
    local_arrival: string;
    airline: string;
    return: number;
  }[];
};

export async function searchKiwi(
  origin: string,
  destination: string,
  pairs: DatePair[]
): Promise<AdapterResult> {
  const key = process.env.KIWI_API_KEY?.trim();
  if (!key) {
    return { source: "kiwi", offers: [], ok: false, error: "KIWI_API_KEY eksik" };
  }

  const limited = pairs.slice(0, 6);
  const results: FlightOffer[] = [];
  const errors: string[] = [];

  await Promise.all(
    limited.map(async (pair) => {
      try {
        const url = new URL(SEARCH_URL);
        url.searchParams.set("fly_from", origin.slice(0, 3));
        url.searchParams.set("fly_to", destination.slice(0, 3));
        url.searchParams.set("date_from", formatKiwiDate(pair.departure));
        url.searchParams.set("date_to", formatKiwiDate(pair.departure));
        url.searchParams.set("return_from", formatKiwiDate(pair.returnDate));
        url.searchParams.set("return_to", formatKiwiDate(pair.returnDate));
        url.searchParams.set("adults", "1");
        url.searchParams.set("curr", "TRY");
        url.searchParams.set("limit", "5");
        url.searchParams.set("sort", "price");
        url.searchParams.set("locale", "tr");

        const res = await fetch(url, {
          headers: { apikey: key },
          signal: AbortSignal.timeout(14_000),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          errors.push(`${pair.departure}: HTTP ${res.status} ${body.slice(0, 100)}`);
          return;
        }
        const json = (await res.json()) as { data?: KiwiItinerary[] };

        for (const item of json.data ?? []) {
          const outbound = item.route.filter((r) => r.return === 0);
          const inbound = item.route.filter((r) => r.return === 1);
          if (!outbound.length || !inbound.length) continue;
          const outFirst = outbound[0];
          const outLast = outbound[outbound.length - 1];
          const inFirst = inbound[0];
          const inLast = inbound[inbound.length - 1];

          results.push({
            id: `kiwi-${item.id}`,
            source: "Kiwi.com",
            sourcePriority: 9,
            price: Math.round(item.price),
            currency: "TRY",
            airline: airlineName(item.airlines?.[0] ?? outFirst.airline),
            outbound: {
              departure: outFirst.local_departure,
              arrival: outLast.local_arrival,
              from: outFirst.flyFrom,
              to: outLast.flyTo,
            },
            inbound: {
              departure: inFirst.local_departure,
              arrival: inLast.local_arrival,
              from: inFirst.flyFrom,
              to: inLast.flyTo,
            },
            stayDays: pair.stayDays,
            purchaseUrl:
              item.deep_link ||
              buildDeepLink("kiwi", { origin, destination, pair }),
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
    source: "kiwi",
    offers: results,
    ok: results.length > 0 || errors.length === 0,
    error: errors.length ? errors.slice(0, 3).join("; ") : undefined,
    meta: { pairsTried: limited.length },
  };
}

function formatKiwiDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}
