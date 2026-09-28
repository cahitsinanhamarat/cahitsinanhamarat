import { NextResponse } from "next/server";
import {
  AIRLINE_SOURCE_COUNT,
  OTA_SOURCE_COUNT,
  SOURCE_COUNT,
  getKeyPresence,
} from "@/lib/sources";
import { STAY_DAY_MAX, STAY_DAY_MIN } from "@/lib/stays";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ücretsiz yol durumu — ücretli API zorunlu değil; uydurma fiyat yok. */
export async function GET() {
  const keys = getKeyPresence();

  return NextResponse.json({
    strategy: "free-deep-link-compare",
    freePath: true,
    description: `Ücretli API yok. Sayısal fiyat yok (yanlış fiyat göstermektense Sitede gör). ${SOURCE_COUNT} çalışan kaynak: ${OTA_SOURCE_COUNT} OTA + ${AIRLINE_SOURCE_COUNT} havayolu (Skyscanner filtreli). Skyscanner #1.`,
    sourceCount: SOURCE_COUNT,
    otaCount: OTA_SOURCE_COUNT,
    airlineCount: AIRLINE_SOURCE_COUNT,
    stayDays: { min: STAY_DAY_MIN, max: STAY_DAY_MAX },
    features: {
      nonstopOnly: true,
      stopsColumn: true,
      numericPrices: false,
      airportPicker: true,
    },
    optionalPaidKeys: keys,
    note:
      "Canlı fiyat yalnızca kaynak sitesinde. CAPTCHA bypass / scraping / demo fiyat yok.",
  });
}
