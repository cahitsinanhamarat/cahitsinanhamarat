import { NextResponse } from "next/server";
import {
  AIRLINE_SOURCE_COUNT,
  SOURCE_COUNT,
  getKeyPresence,
} from "@/lib/sources";
import { STAY_DAY_MAX, STAY_DAY_MIN } from "@/lib/stays";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ücretsiz yol durumu — ücretli API zorunlu değil. */
export async function GET() {
  const keys = getKeyPresence();
  const anyOptional = keys.skyscanner || keys.kiwi || keys.amadeus;

  return NextResponse.json({
    strategy: "free-deep-link-compare",
    freePath: !anyOptional,
    description: `Ücretli API yok. Tarih aralığı + konaklama (2–21) → deep-link karşılaştırma; ${SOURCE_COUNT} kaynak (Skyscanner #1, ${AIRLINE_SOURCE_COUNT} havayolu).`,
    sourceCount: SOURCE_COUNT,
    airlineCount: AIRLINE_SOURCE_COUNT,
    stayDays: { min: STAY_DAY_MIN, max: STAY_DAY_MAX },
    features: {
      nonstopOnly: true,
      stopsColumn: true,
      freePricePreview: true,
      airportPicker: true,
    },
    optionalPaidKeys: keys,
    note:
      "İsteğe bağlı anahtarlar yalnızca bonus canlı fiyat içindir; ürün ücretsiz deep-link + best-effort önizleme ile çalışır. CAPTCHA bypass yok.",
  });
}
