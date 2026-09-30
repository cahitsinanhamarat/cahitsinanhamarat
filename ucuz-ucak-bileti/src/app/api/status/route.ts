import { NextResponse } from "next/server";
import { SOURCE_REGISTRY } from "@/lib/sources/registry";

export const runtime = "nodejs";

export async function GET() {
  const working = SOURCE_REGISTRY.filter((s) => s.status === "working");
  return NextResponse.json({
    app: "ucuz-ucak-bileti",
    verifiedPriceSources: working.map((s) => s.id),
    sources: SOURCE_REGISTRY,
    policy: {
      fakePrices: false,
      captchaBypass: false,
      sort: "round-trip total price ascending",
      sourcePriority: "research order only — not result sort",
      conditionalDiscounts: "labeled separately from standard public price",
    },
  });
}
