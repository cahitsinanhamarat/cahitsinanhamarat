import type { DatePair } from "../dates";
import { buildDeepLink } from "../deep-links";
import type { FlightOffer } from "../types";

const AIRLINES = [
  "Turkish Airlines",
  "Pegasus",
  "AJet",
  "SunExpress",
  "Lufthansa",
  "Aegean",
  "Wizz Air",
  "Corendon Airlines",
];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Anahtar yokken demolanabilir gerçekçi TRY fiyatları.
 * Deterministik: aynı arama aynı sonuçları verir.
 */
export function buildDemoOffers(
  origin: string,
  destination: string,
  pairs: DatePair[]
): FlightOffer[] {
  const samplePairs = pairs.slice(0, Math.min(pairs.length, 8));
  const offers: FlightOffer[] = [];

  for (const pair of samplePairs) {
    const seed = hashSeed(`${origin}-${destination}-${pair.departure}-${pair.stayDays}`);
    const rnd = mulberry32(seed);
    const count = 2 + Math.floor(rnd() * 3);

    for (let i = 0; i < count; i++) {
      const airline = AIRLINES[Math.floor(rnd() * AIRLINES.length)];
      const base = 1800 + Math.floor(rnd() * 6500);
      // Skyscanner “en ucuz” hissi için biraz daha düşük
      const skPrice = Math.round(base * (0.88 + rnd() * 0.08));
      const otherPrice = Math.round(base * (0.95 + rnd() * 0.35));

      const outHour = 6 + Math.floor(rnd() * 12);
      const inHour = 10 + Math.floor(rnd() * 10);
      const durationH = 2 + Math.floor(rnd() * 4);

      const skPair = pair;
      offers.push({
        id: `demo-skyscanner-${pair.departure}-${i}`,
        source: "Skyscanner",
        sourcePriority: 1,
        price: skPrice,
        currency: "TRY",
        airline,
        outbound: {
          departure: `${pair.departure}T${String(outHour).padStart(2, "0")}:15:00`,
          arrival: `${pair.departure}T${String(outHour + durationH).padStart(2, "0")}:45:00`,
          from: origin,
          to: destination,
        },
        inbound: {
          departure: `${pair.returnDate}T${String(inHour).padStart(2, "0")}:20:00`,
          arrival: `${pair.returnDate}T${String(inHour + durationH).padStart(2, "0")}:50:00`,
          from: destination,
          to: origin,
        },
        stayDays: pair.stayDays,
        purchaseUrl: buildDeepLink("skyscanner", {
          origin,
          destination,
          pair: skPair,
        }),
        stops: "unknown" as const,

        stopCount: null,

        mode: "demo",
      });

      // Diğer canlı görünümlü kaynaklar (demo)
      const altSources: { name: string; id: string; priority: number }[] = [
        { name: "Kiwi.com", id: "kiwi", priority: 9 },
        { name: "Enuygun", id: "enuygun", priority: 2 },
        { name: "Kayak", id: "kayak", priority: 3 },
      ];
      const alt = altSources[i % altSources.length];
      offers.push({
        id: `demo-${alt.id}-${pair.departure}-${i}`,
        source: alt.name,
        sourcePriority: alt.priority,
        price: otherPrice + i * 120,
        currency: "TRY",
        airline,
        outbound: {
          departure: `${pair.departure}T${String(outHour + 1).padStart(2, "0")}:00:00`,
          arrival: `${pair.departure}T${String(outHour + 1 + durationH).padStart(2, "0")}:30:00`,
          from: origin,
          to: destination,
        },
        inbound: {
          departure: `${pair.returnDate}T${String(inHour + 1).padStart(2, "0")}:10:00`,
          arrival: `${pair.returnDate}T${String(inHour + 1 + durationH).padStart(2, "0")}:40:00`,
          from: destination,
          to: origin,
        },
        stayDays: pair.stayDays,
        purchaseUrl: buildDeepLink(alt.id, { origin, destination, pair }),
        stops: "unknown" as const,

        stopCount: null,

        mode: "demo",
      });
    }
  }

  return offers;
}
