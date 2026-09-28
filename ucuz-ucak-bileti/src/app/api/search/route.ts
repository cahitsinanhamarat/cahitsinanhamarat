import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/adapters";
import { getAirport, isValidIata, resolveIata } from "@/lib/airports";
import { normalizeStayDays } from "@/lib/stays";
import type { SearchRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SearchRequest>;
    const origin = resolveIata((body.origin || "IST").toString());
    const destination = resolveIata((body.destination || "").toString());
    const startDate = (body.startDate || "").toString();
    const endDate = (body.endDate || "").toString();
    const stayDays = normalizeStayDays(body.stayDays);

    if (!destination || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Varış, başlangıç ve bitiş tarihi zorunludur." },
        { status: 400 }
      );
    }
    if (!isValidIata(origin) || !isValidIata(destination)) {
      return NextResponse.json(
        { error: "Kalkış ve varış 3 harfli IATA kodu olmalıdır." },
        { status: 400 }
      );
    }
    if (origin === destination) {
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
      nonstopOnly: Boolean(body.nonstopOnly),
    });

    return NextResponse.json({
      ...result,
      originMeta: getAirport(origin) ?? { iata: origin },
      destinationMeta: getAirport(destination) ?? { iata: destination },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Arama başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
