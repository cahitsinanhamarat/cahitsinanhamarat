import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/adapters";
import { normalizeStayDays } from "@/lib/stays";
import type { SearchRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SearchRequest>;
    const origin = (body.origin || "IST").toString();
    const destination = (body.destination || "").toString();
    const startDate = (body.startDate || "").toString();
    const endDate = (body.endDate || "").toString();
    const stayDays = normalizeStayDays(body.stayDays);

    if (!destination || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Varış, başlangıç ve bitiş tarihi zorunludur." },
        { status: 400 }
      );
    }
    if (origin.toUpperCase() === destination.toUpperCase()) {
      return NextResponse.json(
        { error: "Kalkış ve varış aynı olamaz." },
        { status: 400 }
      );
    }

    const result = await runSearch({
      origin,
      destination,
      startDate,
      endDate,
      stayDays,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Arama başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
