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
  primaryUrl: string; // Skyscanner
  price: number | null;
  currency: "TRY";
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

export type SearchResponse = {
  /** Ücretsiz yol: tarih çiftleri + kaynak linkleri (asıl ürün). */
  tripOptions: TripOption[];
  tripOptionsTotal: number;
  tripOptionsSampled: boolean;
  /** İsteğe bağlı canlı/demo fiyat satırları (ücretli anahtar varsa). */
  offers: FlightOffer[];
  sources: SourceStatus[];
  datePairsSearched: number;
  /** true = ücretli anahtar yok; ücretsiz deep-link karşılaştırma. */
  freePath: boolean;
  demo: boolean;
  keys: KeyPresence;
  adapters: AdapterSummary[];
  message?: string;
};
