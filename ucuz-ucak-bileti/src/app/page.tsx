"use client";

import { useState, useTransition } from "react";
import {
  SearchForm,
  type SearchFormValues,
} from "@/components/SearchForm";
import { TripCompareResults } from "@/components/TripCompareResults";
import { DEFAULT_STAY_DAYS } from "@/lib/stays";
import type { SearchResponse } from "@/lib/types";

export default function HomePage() {
  const [values, setValues] = useState<SearchFormValues>({
    origin: "IST",
    destination: "AMS",
    startDate: "2026-04-01",
    endDate: "2026-06-01",
    stayDays: [...DEFAULT_STAY_DAYS],
  });
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    if (loading || pending) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Arama başarısız");
        return;
      }
      startTransition(() => {
        setResult(data as SearchResponse);
      });
    } catch {
      setError("Ağ hatası — tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="relative overflow-hidden px-4 pb-10 pt-10 sm:pt-16">
        <div
          aria-hidden
          className="anim-drift pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-[var(--sea-bright)]/25 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[var(--accent)]/15 blur-3xl"
        />

        <div className="relative mx-auto flex max-w-4xl flex-col items-start gap-6">
          <p className="anim-rise brand text-sm font-semibold uppercase tracking-[0.18em] text-[var(--sea)]">
            Türkiye çıkışlı · ücretsiz
          </p>
          <h1 className="anim-rise brand max-w-xl text-4xl font-semibold leading-[1.05] text-[var(--sea-deep)] sm:text-6xl">
            Ucuz Uçak Bileti
          </h1>
          <p className="anim-rise max-w-xl text-base text-[var(--muted)] sm:text-lg">
            Tarih aralığı ve 2–21 gün konaklamaya uyan tüm gidiş-dönüş
            kombinasyonlarını üretin; Skyscanner öncelikli 19 kaynakta tek
            tıkla karşılaştırın. Ücretli API yok — gerçek fiyat kaynak
            sitesinde.
          </p>

          <div className="anim-rise w-full max-w-3xl rounded-xl border border-[var(--line)] bg-white/55 px-4 py-3 text-sm text-[var(--muted)] backdrop-blur">
            <p className="font-semibold text-[var(--sea-deep)]">
              Ücretsiz yol: deep-link çoklu kaynak karşılaştırma
            </p>
            <p className="mt-1 text-xs">
              Sahte demo fiyat yok. Her tarih çifti için Skyscanner (#1) +
              Enuygun, Kayak, Google Flights ve diğer onaylı sitelere hazır
              arama linkleri.
            </p>
          </div>

          <SearchForm
            values={values}
            onChange={setValues}
            onSubmit={runSearch}
            loading={loading || pending}
          />
        </div>
      </header>

      {error && (
        <p className="mx-auto max-w-4xl px-4 text-sm text-red-700">{error}</p>
      )}

      {(loading || pending) && !result && (
        <div className="mx-auto max-w-4xl space-y-3 px-4 py-8">
          <div className="skeleton h-28 w-full" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      )}

      {result && <TripCompareResults result={result} />}

      {!result && !loading && (
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-2 text-sm text-[var(--muted)]">
          <p>
            Örnek: İstanbul → Amsterdam, 1 Nis – 1 Haz, 3 ve 4 gün (isterseniz
            2–21 arası herhangi bir kombinasyon).
          </p>
        </section>
      )}
    </main>
  );
}
