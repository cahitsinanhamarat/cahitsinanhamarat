export type SourceStatus =
  | "working"
  | "partial"
  | "inaccessible"
  | "link-only"
  | "not-attempted";

export type PriceKind = "standard" | "conditional";

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  /** City/metro label shown in picker (may cover multiple airports). */
  label: string;
}

export interface FlightLeg {
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  origin: string;
  destination: string;
  departAt: string; // ISO-ish display: YYYY-MM-DDTHH:mm
  arriveAt: string;
  durationMinutes: number;
  stops: number;
  baggageChecked?: string | null;
  baggageCabin?: string | null;
  farePackage?: string | null;
}

export interface ConditionalDiscount {
  label: string;
  amountTry?: number | null;
  note?: string;
}

export interface Offer {
  id: string;
  sourceId: string;
  sourceName: string;
  totalPriceTry: number;
  currency: "TRY";
  priceKind: PriceKind;
  conditionalDiscounts: ConditionalDiscount[];
  outbound: FlightLeg;
  inbound: FlightLeg;
  stayDays: number;
  bookingUrl: string;
  searchUrl?: string;
  verifiedAt: string;
  notes?: string[];
}

export interface SourceReport {
  id: string;
  name: string;
  priority: number;
  status: SourceStatus;
  realPriceVerified: boolean;
  passengerBaggageReadable: boolean;
  limitations: string[];
  lastTestedAt?: string;
  lastTestRoute?: string;
}

export interface SearchRequest {
  origin: string;
  destination: string;
  earliest: string; // YYYY-MM-DD
  latest: string;
  minStayDays: number;
  maxStayDays: number;
  adults?: number;
  maxDatePairs?: number;
}

export interface SearchResponse {
  offers: Offer[];
  sources: SourceReport[];
  searchedPairs: Array<{ depart: string; return: string }>;
  meta: {
    generatedAt: string;
    note: string;
  };
  errors: Array<{ sourceId: string; message: string }>;
}
