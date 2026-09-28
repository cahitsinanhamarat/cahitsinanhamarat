export type OfferMode = "live" | "link-out" | "demo";

export type FlightLeg = {
  departure: string;
  arrival: string;
  from: string;
  to: string;
};

export type FlightOffer = {
  id: string;
  source: string;
  sourcePriority: number;
  price: number | null;
  currency: "TRY";
  airline: string;
  outbound: FlightLeg;
  inbound: FlightLeg;
  stayDays: number;
  purchaseUrl: string;
  mode: OfferMode;
};

export type SourceLink = {
  id: string;
  name: string;
  priority: number;
  url: string;
};

/** Ücretsiz yol birimi: bir gidiş-dönüş tarih çifti + 19 kaynak linki. */
export type TripOption = {
  id: string;
  departure: string;
  returnDate: string;
  stayDays: number;
  links: SourceLink[];
  primaryUrl: string;
  price: number | null;
  currency: "TRY";
};

/**
 * Sonuç tablosu satırı — kaynak başına kendi gidiş/dönüş tarihi + fiyat.
 * Farklı kaynaklar farklı tarih çiftlerinde “kazanabilir”; tarihler asla gizlenmez.
 */
export type ResultRow = {
  id: string;
  sourceId: string;
  source: string;
  sourcePriority: number;
  outboundDate: string; // YYYY-MM-DD
  returnDate: string;
  stayDays: number;
  /** Gerçek fiyat varsa; yoksa null → UI “Sitede gör” */
  price: number | null;
  currency: "TRY";
  purchaseUrl: string;
  mode: OfferMode;
};

export type SearchRequest = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  stayDays: number[];
};

export type SourceStatus = {
  id: string;
  name: string;
  priority: number;
  mode: OfferMode;
  note: string;
};

export type KeyPresence = {
  skyscanner: boolean;
  kiwi: boolean;
  amadeus: boolean;
};

export type AdapterSummary = {
  source: string;
  ok: boolean;
  count: number;
  error?: string;
  meta?: Record<string, unknown>;
};

/** Kaynak başına en ucuz satır özeti (kendi tarihleriyle). */
export type CheapestPerSource = {
  source: string;
  sourcePriority: number;
  outboundDate: string;
  returnDate: string;
  stayDays: number;
  price: number | null;
  purchaseUrl: string;
};

export type SearchResponse = {
  /** Ana tablo: kaynak × tarih satırları (her satırın kendi tarihleri). */
  rows: ResultRow[];
  rowsTotal: number;
  /** Kaynak başına en iyi satır (fiyat varsa ucuza; yoksa en erken tarih). */
  cheapestPerSource: CheapestPerSource[];
  /** Genel en ucuz satır (yalnızca price != null varken anlamlı). */
  overallCheapest: ResultRow | null;
  tripOptions: TripOption[];
  tripOptionsTotal: number;
  tripOptionsSampled: boolean;
  offers: FlightOffer[];
  sources: SourceStatus[];
  datePairsSearched: number;
  freePath: boolean;
  demo: boolean;
  keys: KeyPresence;
  adapters: AdapterSummary[];
  message?: string;
};
