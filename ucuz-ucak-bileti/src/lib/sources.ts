/**
 * Türkiye’ye/Türkiye’den uçan taşıyıcılar + OTA’lar.
 * Skyscanner her zaman #1. Ücretli API yok — deep-link odaklı.
 */
import trAirlinesData from "@/data/tr-airlines.json";
import type { OfferMode, SourceStatus } from "./types";

export type SourceDef = {
  id: string;
  name: string;
  priority: number;
  kind: "ota" | "airline" | "meta";
  airlineIata?: string;
  canLive: boolean;
  noteLive: string;
  noteLinkOut: string;
};

type AirlineJson = {
  airlines: { iata: string; name: string; country: string; hasTemplate: boolean }[];
  bookTemplates: Record<string, string>;
};

const data = trAirlinesData as AirlineJson;

export const AIRLINE_BOOK_TEMPLATES: Record<string, string> = data.bookTemplates;

/** OTA / meta — Skyscanner birinci. */
const OTA_SOURCES: SourceDef[] = [
  {
    id: "skyscanner",
    name: "Skyscanner",
    priority: 1,
    kind: "ota",
    canLive: true,
    noteLive: "Ücretsiz önizleme veya isteğe bağlı API",
    noteLinkOut: "skyscanner.com.tr deep-link",
  },
  {
    id: "enuygun",
    name: "Enuygun",
    priority: 2,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "enuygun.com deep-link",
  },
  {
    id: "kayak",
    name: "Kayak",
    priority: 3,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "kayak.com.tr deep-link",
  },
  {
    id: "google-flights",
    name: "Google Flights",
    priority: 4,
    kind: "ota",
    canLive: true,
    noteLive: "Ücretsiz genel web önizleme (best-effort)",
    noteLinkOut: "Google Flights deep-link",
  },
  {
    id: "turna",
    name: "Turna",
    priority: 5,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "turna.com deep-link",
  },
  {
    id: "ucuzabilet",
    name: "Ucuzabilet",
    priority: 6,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "ucuzabilet.com deep-link",
  },
  {
    id: "biletall",
    name: "Biletall",
    priority: 7,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "biletall.com deep-link",
  },
  {
    id: "obilet",
    name: "Obilet",
    priority: 8,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "obilet.com uçuş deep-link",
  },
  {
    id: "kiwi",
    name: "Kiwi.com",
    priority: 9,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "kiwi.com deep-link",
  },
  {
    id: "momondo",
    name: "Momondo",
    priority: 10,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "momondo.com deep-link",
  },
  {
    id: "expedia",
    name: "Expedia",
    priority: 11,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "expedia.com deep-link",
  },
  {
    id: "booking",
    name: "Booking.com Flights",
    priority: 12,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "Booking flights deep-link",
  },
  {
    id: "trip",
    name: "Trip.com",
    priority: 13,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "trip.com deep-link",
  },
  {
    id: "edreams",
    name: "eDreams",
    priority: 14,
    kind: "ota",
    canLive: false,
    noteLive: "",
    noteLinkOut: "edreams.com deep-link",
  },
];

/** Havayolları — OpenFlights TR rotaları + güncel taşıyıcı listesi. */
const AIRLINE_SOURCES: SourceDef[] = data.airlines
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name, "tr"))
  .map((a, idx) => ({
    id: `airline-${a.iata.toLowerCase()}`,
    name: a.name,
    priority: 100 + idx,
    kind: "airline" as const,
    airlineIata: a.iata,
    canLive: false,
    noteLive: "",
    noteLinkOut: `${a.name} (${a.iata}) rezervasyon / arama deep-link`,
  }));

export const APPROVED_SOURCES: SourceDef[] = [
  ...OTA_SOURCES,
  ...AIRLINE_SOURCES,
];

export const SOURCE_COUNT = APPROVED_SOURCES.length;
export const AIRLINE_SOURCE_COUNT = AIRLINE_SOURCES.length;

export function hasSkyscannerKey(): boolean {
  return Boolean(process.env.SKYSCANNER_RAPIDAPI_KEY?.trim());
}

export function hasKiwiKey(): boolean {
  return Boolean(process.env.KIWI_API_KEY?.trim());
}

export function hasAmadeusKeys(): boolean {
  return Boolean(
    process.env.AMADEUS_CLIENT_ID?.trim() &&
      process.env.AMADEUS_CLIENT_SECRET?.trim()
  );
}

export function forceDemo(): boolean {
  return process.env.DEMO_MODE === "force";
}

export function getKeyPresence() {
  return {
    skyscanner: hasSkyscannerKey(),
    kiwi: hasKiwiKey(),
    amadeus: hasAmadeusKeys(),
  };
}

export function resolveSourceMode(sourceId: string): OfferMode {
  if (forceDemo()) return "demo";
  if (sourceId === "skyscanner" && hasSkyscannerKey()) return "live";
  if (sourceId === "kiwi" && hasKiwiKey()) return "live";
  if (sourceId === "google-flights") return "link-out";
  return "link-out";
}

export function buildSourceStatuses(demo: boolean): SourceStatus[] {
  return APPROVED_SOURCES.map((s) => {
    if (demo) {
      return {
        id: s.id,
        name: s.name,
        priority: s.priority,
        mode: "demo" as const,
        note: "Demo",
      };
    }
    const mode = resolveSourceMode(s.id);
    return {
      id: s.id,
      name: s.name,
      priority: s.priority,
      mode,
      note: mode === "live" ? s.noteLive : s.noteLinkOut,
    };
  });
}
