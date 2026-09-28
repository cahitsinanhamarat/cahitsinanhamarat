export type OfferMode = "live" | "link-out" | "demo";

export type FlightLeg = {
  departure: string; // ISO datetime or date
  arrival: string;
  from: string; // IATA
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

export type SearchRequest = {
  origin: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
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
  offers: FlightOffer[];
  sources: SourceStatus[];
  datePairsSearched: number;
  demo: boolean;
  keys: KeyPresence;
  adapters: AdapterSummary[];
  message?: string;
};
