/** Metro / şehir kodları → Amadeus için tek havalimanı IATA. */
const AMADEUS_AIRPORT: Record<string, string> = {
  LON: "LHR",
  PAR: "CDG",
  ROM: "FCO",
  MIL: "MXP",
  NYC: "JFK",
  MOW: "SVO",
  TYO: "NRT",
  SEL: "ICN",
  BJS: "PEK",
};

export function toAmadeusAirport(code: string): string {
  const c = code.toUpperCase().slice(0, 3);
  return AMADEUS_AIRPORT[c] ?? c;
}

const AIRLINE_NAMES: Record<string, string> = {
  TK: "Turkish Airlines",
  PC: "Pegasus",
  VF: "AJet",
  XQ: "SunExpress",
  XC: "Corendon Airlines",
  LH: "Lufthansa",
  A3: "Aegean",
  W6: "Wizz Air",
  BA: "British Airways",
  AF: "Air France",
  KL: "KLM",
  EW: "Eurowings",
  U2: "easyJet",
  FR: "Ryanair",
  OS: "Austrian",
  LX: "Swiss",
  SN: "Brussels Airlines",
  AZ: "ITA Airways",
  IB: "Iberia",
  VY: "Vueling",
};

export function airlineName(codeOrName: string | undefined | null): string {
  if (!codeOrName) return "—";
  const key = codeOrName.toUpperCase();
  return AIRLINE_NAMES[key] ?? codeOrName;
}
