import { NextResponse } from "next/server";
import { getKeyPresence } from "@/lib/sources";
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
    description:
      "Ücretli API yok. Tarih aralığı + konaklama (2–21) → tüm geçerli gidiş-dönüş çiftleri + 19 kaynak deep-link (Skyscanner #1).",
    stayDays: { min: STAY_DAY_MIN, max: STAY_DAY_MAX },
    optionalPaidKeys: keys,
    note:
      "İsteğe bağlı anahtarlar yalnızca bonus canlı fiyat içindir; ürün ücretsiz deep-link ile çalışır. CAPTCHA bypass / scraping yok.",
  });
}
