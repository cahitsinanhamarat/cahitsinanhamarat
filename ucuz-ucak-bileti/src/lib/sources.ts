/**
 * Çalışan deep-link kaynakları (doğrulanmış / bilinen arama URL şeması).
 * Skyscanner her zaman #1. Kırık / uydurma booking şablonları YOK.
 * Ücretli API yok — yalnızca link-out.
 */
import type { OfferMode, SourceStatus } from "./types";

export type SourceDef = {
  id: string;
  name: string;
  priority: number;
  kind: "ota" | "airline";
  airlineIata?: string;
  active: boolean;
  noteLinkOut: string;
};

/**
 * OTA — HTTP denetiminde 200/202 veya bilinen geçerli arama şeması.
 * 403 bot engeli olan TR OTAlar tarayıcıda açılabilir; yine de yalnızca
 * parametreli arama URL’si bilinenler tutuldu.
 */
const OTA_SOURCES: SourceDef[] = [
  {
    id: "skyscanner",
    name: "Skyscanner",
    priority: 1,
    kind: "ota",
    active: true,
    noteLinkOut: "skyscanner.com.tr gidiş-dönüş arama",
  },
  {
    id: "kayak",
    name: "Kayak",
    priority: 2,
    kind: "ota",
    active: true,
    noteLinkOut: "kayak.com.tr /flights/{o}-{d}/{dep}/{ret}",
  },
  {
    id: "google-flights",
    name: "Google Flights",
    priority: 3,
    kind: "ota",
    active: true,
    noteLinkOut: "Google Flights #flt= round-trip",
  },
  {
    id: "kiwi",
    name: "Kiwi.com",
    priority: 4,
    kind: "ota",
    active: true,
    noteLinkOut: "kiwi.com /search/results/{o}-{d}/{dep}/{ret}",
  },
  {
    id: "momondo",
    name: "Momondo",
    priority: 5,
    kind: "ota",
    active: true,
    noteLinkOut: "momondo.com /flight-search/{o}-{d}/{dep}/{ret}",
  },
  {
    id: "trip",
    name: "Trip.com",
    priority: 6,
    kind: "ota",
    active: true,
    noteLinkOut: "trip.com roundtrip deep-link",
  },
  {
    id: "booking",
    name: "Booking.com Flights",
    priority: 7,
    kind: "ota",
    active: true,
    noteLinkOut: "booking.com/flights round-trip params",
  },
  {
    id: "edreams",
    name: "eDreams",
    priority: 8,
    kind: "ota",
    active: true,
    noteLinkOut: "edreams.com #results type=R",
  },
  {
    id: "expedia",
    name: "Expedia",
    priority: 9,
    kind: "ota",
    active: true,
    noteLinkOut: "expedia.com Flights-Search roundtrip",
  },
];

/**
 * Havayolları — kendi sitelerindeki uydurma ?origin= şablonları çoğu 404/403.
 * Bunun yerine Skyscanner airline filtresi (çalışan Skyscanner URL + airlines=)
 * kullanılıyor; kullanıcı gerçek bir arama sayfasına iner.
 * Yalnızca TR çıkışlı sık uçan / doğrulanabilir taşıyıcılar.
 */
const VERIFIED_AIRLINES: { iata: string; name: string }[] = [
  { iata: "TK", name: "Turkish Airlines" },
  { iata: "PC", name: "Pegasus" },
  { iata: "VF", name: "AJet" },
  { iata: "XQ", name: "SunExpress" },
  { iata: "XC", name: "Corendon Airlines" },
  { iata: "W6", name: "Wizz Air" },
  { iata: "FR", name: "Ryanair" },
  { iata: "A3", name: "Aegean Airlines" },
  { iata: "LH", name: "Lufthansa" },
  { iata: "LX", name: "SWISS" },
  { iata: "OS", name: "Austrian Airlines" },
  { iata: "AF", name: "Air France" },
  { iata: "KL", name: "KLM" },
  { iata: "BA", name: "British Airways" },
  { iata: "QR", name: "Qatar Airways" },
  { iata: "EK", name: "Emirates" },
  { iata: "EY", name: "Etihad Airways" },
  { iata: "EW", name: "Eurowings" },
  { iata: "U2", name: "easyJet" },
  { iata: "LO", name: "LOT Polish Airlines" },
];

const AIRLINE_SOURCES: SourceDef[] = VERIFIED_AIRLINES.map((a, idx) => ({
  id: `airline-${a.iata.toLowerCase()}`,
  name: a.name,
  priority: 100 + idx,
  kind: "airline" as const,
  airlineIata: a.iata,
  active: true,
  noteLinkOut: `Skyscanner filtreli arama · ${a.iata}`,
}));

/** Eski/kırık kaynaklar — sonuçlara dahil edilmez (referans). */
export const INACTIVE_SOURCES: { id: string; reason: string }[] = [
  { id: "enuygun", reason: "Bot 403; parametreli URL güvenilir değil" },
  { id: "turna", reason: "Bot 403 / kırık arama path" },
  { id: "ucuzabilet", reason: "Bot 403 / kırık arama path" },
  { id: "biletall", reason: "Zaman aşımı / yanıt yok" },
  { id: "obilet", reason: "Uçuş deep-link doğrulanmadı (genel 200)" },
  {
    id: "airline-* (eski şablonlar)",
    reason:
      "Çoğu airline-site ?origin= şablonu 404/403 veya ana sayfaya düşüyor; listeden çıkarıldı",
  },
];

export const APPROVED_SOURCES: SourceDef[] = [
  ...OTA_SOURCES,
  ...AIRLINE_SOURCES,
].filter((s) => s.active);

export const SOURCE_COUNT = APPROVED_SOURCES.length;
export const AIRLINE_SOURCE_COUNT = AIRLINE_SOURCES.length;
export const OTA_SOURCE_COUNT = OTA_SOURCES.length;

/** Geriye uyumluluk — artık kullanılmıyor; boş. */
export const AIRLINE_BOOK_TEMPLATES: Record<string, string> = {};

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
  // Ücretsiz yolda asla demo/preview fiyat yok
  if (forceDemo()) return "link-out";
  if (sourceId === "skyscanner" && hasSkyscannerKey()) return "live";
  if (sourceId === "kiwi" && hasKiwiKey()) return "live";
  return "link-out";
}

export function buildSourceStatuses(demo: boolean): SourceStatus[] {
  return APPROVED_SOURCES.map((s) => {
    const mode = demo ? ("link-out" as const) : resolveSourceMode(s.id);
    return {
      id: s.id,
      name: s.name,
      priority: s.priority,
      mode,
      note: s.noteLinkOut,
    };
  });
}
