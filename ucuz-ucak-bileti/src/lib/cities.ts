export type City = {
  iata: string;
  name: string;
  country: string;
};

/** Sık kullanılan kalkış/varış noktaları (TR odaklı + popüler Avrupa). */
export const CITIES: City[] = [
  { iata: "IST", name: "İstanbul (IST)", country: "TR" },
  { iata: "SAW", name: "İstanbul Sabiha (SAW)", country: "TR" },
  { iata: "ESB", name: "Ankara", country: "TR" },
  { iata: "ADB", name: "İzmir", country: "TR" },
  { iata: "AYT", name: "Antalya", country: "TR" },
  { iata: "BJV", name: "Bodrum", country: "TR" },
  { iata: "DLM", name: "Dalaman", country: "TR" },
  { iata: "TZX", name: "Trabzon", country: "TR" },
  { iata: "ASR", name: "Kayseri", country: "TR" },
  { iata: "GZT", name: "Gaziantep", country: "TR" },
  { iata: "ECN", name: "Ercan (KKTC)", country: "CY" },
  { iata: "AMS", name: "Amsterdam", country: "NL" },
  { iata: "BER", name: "Berlin", country: "DE" },
  { iata: "FRA", name: "Frankfurt", country: "DE" },
  { iata: "MUC", name: "Münih", country: "DE" },
  { iata: "VIE", name: "Viyana", country: "AT" },
  { iata: "ZRH", name: "Zürih", country: "CH" },
  { iata: "LON", name: "Londra (tümü)", country: "GB" },
  { iata: "LHR", name: "Londra Heathrow", country: "GB" },
  { iata: "STN", name: "Londra Stansted", country: "GB" },
  { iata: "PAR", name: "Paris (tümü)", country: "FR" },
  { iata: "CDG", name: "Paris CDG", country: "FR" },
  { iata: "BCN", name: "Barselona", country: "ES" },
  { iata: "MAD", name: "Madrid", country: "ES" },
  { iata: "ROM", name: "Roma (tümü)", country: "IT" },
  { iata: "FCO", name: "Roma Fiumicino", country: "IT" },
  { iata: "ATH", name: "Atina", country: "GR" },
  { iata: "SKG", name: "Selanik", country: "GR" },
  { iata: "PRG", name: "Prag", country: "CZ" },
  { iata: "BUD", name: "Budapeşte", country: "HU" },
  { iata: "WAW", name: "Varşova", country: "PL" },
  { iata: "DXB", name: "Dubai", country: "AE" },
  { iata: "BAK", name: "Bakü", country: "AZ" },
  { iata: "TBS", name: "Tiflis", country: "GE" },
  { iata: "CAI", name: "Kahire", country: "EG" },
  { iata: "SSH", name: "Sharm El Sheikh", country: "EG" },
];

export function cityByIata(iata: string): City | undefined {
  return CITIES.find((c) => c.iata === iata.toUpperCase());
}

export function cityLabel(iata: string): string {
  return cityByIata(iata)?.name ?? iata.toUpperCase();
}
