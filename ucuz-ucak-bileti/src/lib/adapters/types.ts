import type { FlightOffer } from "../types";

export type AdapterResult = {
  source: "skyscanner" | "kiwi" | "amadeus";
  offers: FlightOffer[];
  ok: boolean;
  error?: string;
  meta?: Record<string, unknown>;
};
