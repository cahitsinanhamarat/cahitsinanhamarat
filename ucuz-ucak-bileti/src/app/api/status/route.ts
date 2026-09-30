import { NextResponse } from "next/server";
import { airportStats } from "@/lib/airports";
import { SOURCE_REGISTRY } from "@/lib/sources/registry";
import { skyscannerBaseReport } from "@/lib/sources/skyscanner";

export const runtime = "nodejs";

export async function GET() {
  const stats = airportStats();
  const sources = SOURCE_REGISTRY.map((s) =>
    s.id === "skyscanner" ? skyscannerBaseReport() : s,
  );
  const working = sources.filter((s) => s.status === "working");
  return NextResponse.json({
    app: "ucuz-ucak-bileti",
    verifiedPriceSources: working.map((s) => s.id),
    airports: stats,
    sources,
    policy: {
      fakePrices: false,
      captchaBypass: false,
      sort: "round-trip total price ascending",
      sourcePriority: "research order only — not result sort",
      conditionalDiscounts: "labeled separately from standard public price",
      skyscanner:
        "Verified prices only via official partner API key (SKYSCANNER_API_KEY). No scrape/CAPTCHA bypass. Not a hard dependency.",
    },
  });
}
