import { NextResponse } from "next/server";
import { parseIsoDate } from "@/lib/dates";
import { runSearch } from "@/lib/sources/search";
import type { SearchRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SearchRequest>;
    const origin = String(body.origin || "").trim().toUpperCase();
    const destination = String(body.destination || "").trim().toUpperCase();
    const earliest = String(body.earliest || "");
    const latest = String(body.latest || "");
    const minStayDays = Number(body.minStayDays ?? 3);
    const maxStayDays = Number(body.maxStayDays ?? 7);
    const adults = Number(body.adults ?? 1);
    const maxDatePairs = Number(body.maxDatePairs ?? 4);

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Kalkış ve varış gerekli." },
        { status: 400 },
      );
    }
    if (origin === destination) {
      return NextResponse.json(
        { error: "Kalkış ve varış farklı olmalı." },
        { status: 400 },
      );
    }
    if (!parseIsoDate(earliest) || !parseIsoDate(latest)) {
      return NextResponse.json(
        { error: "Tarih aralığı YYYY-AA-GG formatında olmalı." },
        { status: 400 },
      );
    }
    if (latest < earliest) {
      return NextResponse.json(
        { error: "Bitiş tarihi başlangıçtan önce olamaz." },
        { status: 400 },
      );
    }
    if (minStayDays < 1 || maxStayDays < minStayDays || maxStayDays > 30) {
      return NextResponse.json(
        { error: "Konaklama 1–30 gün ve min≤max olmalı." },
        { status: 400 },
      );
    }

    const result = await runSearch({
      origin,
      destination,
      earliest,
      latest,
      minStayDays,
      maxStayDays,
      adults: Math.min(9, Math.max(1, adults)),
      maxDatePairs: Math.min(8, Math.max(1, maxDatePairs)),
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Arama başarısız",
      },
      { status: 500 },
    );
  }
}
