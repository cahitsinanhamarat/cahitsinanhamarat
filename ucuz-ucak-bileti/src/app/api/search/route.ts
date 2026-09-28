import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/adapters";
import { getAirport } from "@/lib/airports";
import {
  isValidPlace,
  placesOverlap,
  resolvePlace,
} from "@/lib/places";
import { normalizeStayDays } from "@/lib/stays";
import type { SearchRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SearchRequest>;
    const origin = (body.origin || "CITY:TR:istanbul").toString().trim();
    const destination = (body.destination || "").toString().trim();
    const startDate = (body.startDate || "").toString();
    const endDate = (body.endDate || "").toString();
    const stayDays = normalizeStayDays(body.stayDays);

    if (!destination || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Varış, başlangıç ve bitiş tarihi zorunludur." },
        { status: 400 }
      );
    }
    if (!isValidPlace(origin) || !isValidPlace(destination)) {
      return NextResponse.json(
        {
          error:
            "Kalkış/varış geçerli IATA veya şehir (tüm havalimanları) kodu olmalı.",
        },
        { status: 400 }
      );
    }
    if (placesOverlap(origin, destination)) {
      return NextResponse.json(
        { error: "Kalkış ve varış aynı yer / çakışan havalimanı olamaz." },
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

    const o = resolvePlace(origin);
    const d = resolvePlace(destination);

    return NextResponse.json({
      ...result,
      originMeta: o
        ? {
            code: o.code,
            kind: o.kind,
            label: o.label,
            airports: o.airports,
            iata: o.primaryIata,
            city: o.city,
            ...(getAirport(o.primaryIata) ?? {}),
          }
        : { code: origin },
      destinationMeta: d
        ? {
            code: d.code,
            kind: d.kind,
            label: d.label,
            airports: d.airports,
            iata: d.primaryIata,
            city: d.city,
            ...(getAirport(d.primaryIata) ?? {}),
          }
        : { code: destination },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Arama başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
