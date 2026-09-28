export type OfferMode = "live" | "link-out" | "demo" | "preview";

export type StopsKind = "nonstop" | "connecting" | "unknown";

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
  stops: StopsKind;
  stopCount: number | null;
};

export type SourceLink = {
  id: string;
  name: string;
  priority: number;
  url: string;
};

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

export type ResultRow = {
  id: string;
  sourceId: string;
  source: string;
  sourcePriority: number;
  outboundDate: string;
  returnDate: string;
  stayDays: number;
  price: number | null;
  currency: "TRY";
  purchaseUrl: string;
  mode: OfferMode;
  /** aktarmasız | aktarmalı | bilinmiyor */
  stops: StopsKind;
  stopCount: number | null;
};

export type SearchRequest = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  stayDays: number[];
  /** Yalnızca aktarmasız */
  nonstopOnly?: boolean;
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

export type CheapestPerSource = {
  source: string;
  sourcePriority: number;
  outboundDate: string;
  returnDate: string;
  stayDays: number;
  price: number | null;
  purchaseUrl: string;
  stops: StopsKind;
};

export type SearchResponse = {
  rows: ResultRow[];
  rowsTotal: number;
  cheapestPerSource: CheapestPerSource[];
  overallCheapest: ResultRow | null;
  tripOptions: TripOption[];
  tripOptionsTotal: number;
  tripOptionsSampled: boolean;
  offers: FlightOffer[];
  sources: SourceStatus[];
  datePairsSearched: number;
  freePath: boolean;
  demo: boolean;
  nonstopOnly: boolean;
  keys: KeyPresence;
  adapters: AdapterSummary[];
  sourceCount: number;
  airlineCount: number;
  message?: string;
};
