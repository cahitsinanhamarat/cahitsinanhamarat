import type { DatePair } from "../dates";
import { buildDeepLink } from "../deep-links";
import type { FlightOffer } from "../types";

/**
 * RapidAPI Skyscanner (ör. skyscanner44 / skyscanner-api) entegrasyonu.
 * Host env ile özelleştirilebilir; anahtar yoksa boş döner (deep-link kullanılır).
 */
export async function searchSkyscanner(
  origin: string,
  destination: string,
  pairs: DatePair[]
): Promise<FlightOffer[]> {
  const key = process.env.SKYSCANNER_RAPIDAPI_KEY;
  const host =
    process.env.SKYSCANNER_RAPIDAPI_HOST ||
    "sky-scanner3.p.rapidapi.com";
  if (!key) return [];

  const limited = pairs.slice(0, 4);
  const results: FlightOffer[] = [];

  await Promise.all(
    limited.map(async (pair) => {
      try {
        // Yaygın RapidAPI Skyscanner search uç noktası
        const url = new URL(
          `https://${host}/flights/search-roundtrip`
        );
        url.searchParams.set("fromEntityId", origin.slice(0, 3));
        url.searchParams.set("toEntityId", destination.slice(0, 3));
        url.searchParams.set("departDate", pair.departure);
        url.searchParams.set("returnDate", pair.returnDate);
        url.searchParams.set("currency", "TRY");
        url.searchParams.set("market", "TR");
        url.searchParams.set("locale", "tr-TR");
        url.searchParams.set("adults", "1");

        const res = await fetch(url, {
          headers: {
            "x-rapidapi-key": key,
            "x-rapidapi-host": host,
          },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) return;

        const json = (await res.json()) as Record<string, unknown>;
        const parsed = parseSkyscannerPayload(json, origin, destination, pair);
        results.push(...parsed);
      } catch {
        // ignore
      }
    })
  );

  return results;
}

function parseSkyscannerPayload(
  json: Record<string, unknown>,
  origin: string,
  destination: string,
  pair: DatePair
): FlightOffer[] {
  const offers: FlightOffer[] = [];
  // Farklı RapidAPI sarmalayıcıları — esnek parse
  const buckets =
    (json?.data as { itineraries?: unknown[] })?.itineraries ??
    (json?.itineraries as unknown[]) ??
    (json?.flights as unknown[]) ??
    [];

  let i = 0;
  for (const raw of buckets.slice(0, 8)) {
    const item = raw as Record<string, unknown>;
    const priceObj = item.price as { raw?: number; amount?: number } | number | undefined;
    let price: number | null = null;
    if (typeof priceObj === "number") price = Math.round(priceObj);
    else if (priceObj && typeof priceObj.raw === "number")
      price = Math.round(priceObj.raw);
    else if (priceObj && typeof priceObj.amount === "number")
      price = Math.round(priceObj.amount);

    const airline =
      (item.airline as string) ||
      (item.marketingCarrier as string) ||
      ((item.legs as { carriers?: { name?: string }[] }[])?.[0]?.carriers?.[0]
        ?.name as string) ||
      "Skyscanner";

    offers.push({
      id: `skyscanner-${pair.departure}-${i++}`,
      source: "Skyscanner",
      sourcePriority: 1,
      price,
      currency: "TRY",
      airline,
      outbound: {
        departure: `${pair.departure}T00:00:00`,
        arrival: `${pair.departure}T00:00:00`,
        from: origin,
        to: destination,
      },
      inbound: {
        departure: `${pair.returnDate}T00:00:00`,
        arrival: `${pair.returnDate}T00:00:00`,
        from: destination,
        to: origin,
      },
      stayDays: pair.stayDays,
      purchaseUrl:
        (item.deepLink as string) ||
        (item.url as string) ||
        buildDeepLink("skyscanner", { origin, destination, pair }),
      mode: "live",
    });
  }

  return offers;
}
