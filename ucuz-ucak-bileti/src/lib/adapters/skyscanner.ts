import type { DatePair } from "../dates";
import { buildDeepLink } from "../deep-links";
import { airlineName } from "../airlines";
import type { FlightOffer } from "../types";
import type { AdapterResult } from "./types";

type Provider = {
  host: string;
  path: string;
  buildParams: (
    origin: string,
    destination: string,
    pair: DatePair
  ) => URLSearchParams;
};

/**
 * RapidAPI Skyscanner sağlayıcıları host/path farkı gösterir.
 * SKYSCANNER_RAPIDAPI_HOST + isteğe bağlı SKYSCANNER_RAPIDAPI_PATH ile override.
 */
function providers(): Provider[] {
  const host =
    process.env.SKYSCANNER_RAPIDAPI_HOST?.trim() ||
    "sky-scanner3.p.rapidapi.com";
  const pathOverride = process.env.SKYSCANNER_RAPIDAPI_PATH?.trim();

  const roundtripParams = (
    origin: string,
    destination: string,
    pair: DatePair
  ) => {
    const p = new URLSearchParams();
    p.set("fromEntityId", origin.slice(0, 3));
    p.set("toEntityId", destination.slice(0, 3));
    p.set("departDate", pair.departure);
    p.set("returnDate", pair.returnDate);
    p.set("currency", "TRY");
    p.set("market", "TR");
    p.set("locale", "tr-TR");
    p.set("adults", "1");
    return p;
  };

  if (pathOverride) {
    return [{ host, path: pathOverride, buildParams: roundtripParams }];
  }

  return [
    {
      host,
      path: "/flights/search-roundtrip",
      buildParams: roundtripParams,
    },
    {
      host,
      path: "/flights/search",
      buildParams: (o, d, pair) => {
        const p = roundtripParams(o, d, pair);
        p.set("tripType", "roundtrip");
        return p;
      },
    },
  ];
}

export async function searchSkyscanner(
  origin: string,
  destination: string,
  pairs: DatePair[]
): Promise<AdapterResult> {
  const key = process.env.SKYSCANNER_RAPIDAPI_KEY?.trim();
  if (!key) {
    return {
      source: "skyscanner",
      offers: [],
      ok: false,
      error: "SKYSCANNER_RAPIDAPI_KEY eksik",
    };
  }

  const limited = pairs.slice(0, 4);
  const results: FlightOffer[] = [];
  const errors: string[] = [];
  const tried = providers();

  for (const pair of limited) {
    let pairOk = false;
    for (const provider of tried) {
      try {
        const url = new URL(`https://${provider.host}${provider.path}`);
        const params = provider.buildParams(origin, destination, pair);
        params.forEach((v, k) => url.searchParams.set(k, v));

        const res = await fetch(url, {
          headers: {
            "x-rapidapi-key": key,
            "x-rapidapi-host": provider.host,
          },
          signal: AbortSignal.timeout(16_000),
        });
        if (!res.ok) {
          errors.push(
            `${pair.departure}@${provider.path}: HTTP ${res.status}`
          );
          continue;
        }
        const json = (await res.json()) as Record<string, unknown>;
        const parsed = parseSkyscannerPayload(
          json,
          origin,
          destination,
          pair
        );
        if (parsed.length) {
          results.push(...parsed);
          pairOk = true;
          break;
        }
      } catch (e) {
        errors.push(
          `${pair.departure}: ${e instanceof Error ? e.message : "hata"}`
        );
      }
    }
    if (!pairOk && !errors.length) {
      errors.push(`${pair.departure}: boş yanıt`);
    }
  }

  return {
    source: "skyscanner",
    offers: results,
    ok: results.length > 0,
    error: results.length
      ? undefined
      : errors.slice(0, 4).join("; ") || "Sonuç yok",
    meta: {
      host: tried[0]?.host,
      pairsTried: limited.length,
    },
  };
}

function parseSkyscannerPayload(
  json: Record<string, unknown>,
  origin: string,
  destination: string,
  pair: DatePair
): FlightOffer[] {
  const offers: FlightOffer[] = [];
  const data = json.data as Record<string, unknown> | undefined;

  const buckets: unknown[] =
    (data?.itineraries as unknown[]) ||
    (json.itineraries as unknown[]) ||
    (data?.flights as unknown[]) ||
    (json.flights as unknown[]) ||
    (Array.isArray(data) ? (data as unknown[]) : []) ||
    [];

  let i = 0;
  for (const raw of buckets.slice(0, 8)) {
    const item = raw as Record<string, unknown>;
    const price = extractPrice(item);
    const legs = (item.legs as Record<string, unknown>[]) || [];
    const outLeg = legs[0];
    const inLeg = legs[1];

    const airline =
      airlineName(
        (item.airline as string) ||
          (item.marketingCarrier as string) ||
          ((outLeg?.carriers as { name?: string }[])?.[0]?.name as string) ||
          ((outLeg?.marketing_carrier as { name?: string })?.name as string)
      ) || "Skyscanner";

    offers.push({
      id: `skyscanner-${pair.departure}-${i++}`,
      source: "Skyscanner",
      sourcePriority: 1,
      price,
      currency: "TRY",
      airline,
      outbound: {
        departure:
          (outLeg?.departure as string) ||
          `${pair.departure}T00:00:00`,
        arrival:
          (outLeg?.arrival as string) || `${pair.departure}T00:00:00`,
        from:
          ((outLeg?.origin as { displayCode?: string })?.displayCode as string) ||
          origin,
        to:
          ((outLeg?.destination as { displayCode?: string })
            ?.displayCode as string) || destination,
      },
      inbound: {
        departure:
          (inLeg?.departure as string) || `${pair.returnDate}T00:00:00`,
        arrival:
          (inLeg?.arrival as string) || `${pair.returnDate}T00:00:00`,
        from:
          ((inLeg?.origin as { displayCode?: string })?.displayCode as string) ||
          destination,
        to:
          ((inLeg?.destination as { displayCode?: string })
            ?.displayCode as string) || origin,
      },
      stayDays: pair.stayDays,
      purchaseUrl:
        (item.deepLink as string) ||
        (item.url as string) ||
        ((item.pricingOptions as { agents?: { url?: string }[] }[])?.[0]
          ?.agents?.[0]?.url as string) ||
        buildDeepLink("skyscanner", { origin, destination, pair }),
      stops: "unknown" as const,

      stopCount: null,

      mode: "live",
    });
  }

  return offers;
}

function extractPrice(item: Record<string, unknown>): number | null {
  const priceObj = item.price as
    | { raw?: number; amount?: number; total?: number }
    | number
    | undefined;
  if (typeof priceObj === "number") return Math.round(priceObj);
  if (priceObj && typeof priceObj.raw === "number")
    return Math.round(priceObj.raw);
  if (priceObj && typeof priceObj.amount === "number")
    return Math.round(priceObj.amount);
  if (priceObj && typeof priceObj.total === "number")
    return Math.round(priceObj.total);

  const pricing = item.pricingOptions as { price?: { amount?: number } }[];
  if (pricing?.[0]?.price?.amount != null) {
    return Math.round(pricing[0].price.amount);
  }
  return null;
}
