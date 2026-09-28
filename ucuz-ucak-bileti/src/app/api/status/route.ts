import { NextResponse } from "next/server";
import {
  forceDemo,
  getKeyPresence,
  hasAmadeusKeys,
  hasKiwiKey,
  hasSkyscannerKey,
} from "@/lib/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hangi canlı API anahtarlarının yüklü olduğunu gösterir (değerleri değil). */
export async function GET() {
  const keys = getKeyPresence();
  const demo = forceDemo() || (!keys.skyscanner && !keys.kiwi && !keys.amadeus);

  return NextResponse.json({
    demo,
    keys,
    requiredToGoLive: {
      skyscanner: ["SKYSCANNER_RAPIDAPI_KEY", "SKYSCANNER_RAPIDAPI_HOST?"],
      kiwi: ["KIWI_API_KEY"],
      amadeus: [
        "AMADEUS_CLIENT_ID",
        "AMADEUS_CLIENT_SECRET",
        "AMADEUS_ENV=test|production",
      ],
    },
    howTo: "cp .env.example .env.local — anahtarları doldurun — npm run dev",
    signup: {
      amadeus: "https://developers.amadeus.com/ (Self-Service ücretsiz test)",
      kiwi: "https://tequila.kiwi.com/",
      skyscanner:
        "https://rapidapi.com/ — Skyscanner flights provider aboneliği",
    },
    configured: {
      skyscanner: hasSkyscannerKey(),
      kiwi: hasKiwiKey(),
      amadeus: hasAmadeusKeys(),
      amadeusEnv: process.env.AMADEUS_ENV || "test",
      skyscannerHost:
        process.env.SKYSCANNER_RAPIDAPI_HOST || "sky-scanner3.p.rapidapi.com",
    },
  });
}
