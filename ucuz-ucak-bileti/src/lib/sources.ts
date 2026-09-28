import type { OfferMode, SourceStatus } from "./types";

export type SourceDef = {
  id: string;
  name: string;
  priority: number;
  canLive: boolean;
  noteLive: string;
  noteLinkOut: string;
};

/** Onaylı kaynak listesi — Skyscanner #1. */
export const APPROVED_SOURCES: SourceDef[] = [
  {
    id: "skyscanner",
    name: "Skyscanner",
    priority: 1,
    canLive: true,
    noteLive: "RapidAPI Skyscanner anahtarı ile canlı fiyat",
    noteLinkOut: "skyscanner.com.tr deep-link",
  },
  {
    id: "enuygun",
    name: "Enuygun",
    priority: 2,
    canLive: false,
    noteLive: "",
    noteLinkOut: "Resmi partner API yok — deep-link",
  },
  {
    id: "kayak",
    name: "Kayak",
    priority: 3,
    canLive: false,
    noteLive: "",
    noteLinkOut: "kayak.com.tr deep-link",
  },
  {
    id: "google-flights",
    name: "Google Flights",
    priority: 4,
    canLive: false,
    noteLive: "",
    noteLinkOut: "Google Flights deep-link",
  },
  {
    id: "turna",
    name: "Turna",
    priority: 5,
    canLive: false,
    noteLive: "",
    noteLinkOut: "turna.com deep-link",
  },
  {
    id: "ucuzabilet",
    name: "Ucuzabilet",
    priority: 6,
    canLive: false,
    noteLive: "",
    noteLinkOut: "ucuzabilet.com deep-link",
  },
  {
    id: "biletall",
    name: "Biletall",
    priority: 7,
    canLive: false,
    noteLive: "",
    noteLinkOut: "biletall.com deep-link",
  },
  {
    id: "obilet",
    name: "Obilet",
    priority: 8,
    canLive: false,
    noteLive: "",
    noteLinkOut: "obilet.com uçuş deep-link",
  },
  {
    id: "kiwi",
    name: "Kiwi.com",
    priority: 9,
    canLive: true,
    noteLive: "Tequila API ile canlı fiyat",
    noteLinkOut: "kiwi.com deep-link",
  },
  {
    id: "momondo",
    name: "Momondo",
    priority: 10,
    canLive: false,
    noteLive: "",
    noteLinkOut: "momondo.com deep-link",
  },
  {
    id: "thy",
    name: "Turkish Airlines",
    priority: 11,
    canLive: false,
    noteLive: "",
    noteLinkOut: "turkishairlines.com deep-link",
  },
  {
    id: "pegasus",
    name: "Pegasus",
    priority: 12,
    canLive: false,
    noteLive: "",
    noteLinkOut: "flypgs.com deep-link",
  },
  {
    id: "ajet",
    name: "AJet",
    priority: 13,
    canLive: false,
    noteLive: "",
    noteLinkOut: "ajet.com deep-link",
  },
  {
    id: "sunexpress",
    name: "SunExpress",
    priority: 14,
    canLive: false,
    noteLive: "",
    noteLinkOut: "sunexpress.com deep-link",
  },
  {
    id: "corendon",
    name: "Corendon Airlines",
    priority: 15,
    canLive: false,
    noteLive: "",
    noteLinkOut: "corendonairlines.com deep-link",
  },
  {
    id: "expedia",
    name: "Expedia",
    priority: 16,
    canLive: false,
    noteLive: "",
    noteLinkOut: "expedia.com flights deep-link",
  },
  {
    id: "booking",
    name: "Booking.com Flights",
    priority: 17,
    canLive: false,
    noteLive: "",
    noteLinkOut: "Booking flights deep-link",
  },
  {
    id: "trip",
    name: "Trip.com",
    priority: 18,
    canLive: false,
    noteLive: "",
    noteLinkOut: "trip.com deep-link",
  },
  {
    id: "edreams",
    name: "eDreams",
    priority: 19,
    canLive: false,
    noteLive: "",
    noteLinkOut: "edreams.com deep-link",
  },
];

export function hasSkyscannerKey(): boolean {
  return Boolean(process.env.SKYSCANNER_RAPIDAPI_KEY);
}

export function hasKiwiKey(): boolean {
  return Boolean(process.env.KIWI_API_KEY);
}

export function hasAmadeusKeys(): boolean {
  return Boolean(
    process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET
  );
}

export function forceDemo(): boolean {
  return process.env.DEMO_MODE === "force";
}

export function resolveSourceMode(sourceId: string): OfferMode {
  if (forceDemo()) return "demo";
  if (sourceId === "skyscanner" && hasSkyscannerKey()) return "live";
  if (sourceId === "kiwi" && hasKiwiKey()) return "live";
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
        note: "Demo modu — örnek fiyatlar",
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
