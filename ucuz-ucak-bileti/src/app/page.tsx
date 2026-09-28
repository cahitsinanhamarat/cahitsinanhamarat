"use client";

import { useMemo, useState, useTransition } from "react";
import { SearchForm, type SearchFormValues } from "@/components/SearchForm";
import { ResultsList } from "@/components/ResultsList";
import type { SearchResponse } from "@/lib/types";

function defaultDates() {
  const start = new Date();
  start.setDate(start.getDate() + 21);
  const end = new Date(start);
  end.setDate(end.getDate() + 60);
  const toYmd = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: toYmd(start), endDate: toYmd(end) };
}

export default function HomePage() {
  const defaults = useMemo(() => defaultDates(), []);
  const [values, setValues] = useState<SearchFormValues>({
    origin: "IST",
    destination: "AMS",
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    stayDays: [3, 4],
  });
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Arama başarısız");
        setResult(null);
        return;
      }
      startTransition(() => setResult(data as SearchResponse));
    } catch {
      setError("Ağ hatası — tekrar deneyin.");
      setResult(null);
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
            Türkiye çıkışlı
          </p>
          <h1 className="anim-rise brand max-w-xl text-4xl font-semibold leading-[1.05] text-[var(--sea-deep)] sm:text-6xl">
            Ucuz Uçak Bileti
          </h1>
          <p className="anim-rise max-w-xl text-base text-[var(--muted)] sm:text-lg">
            Tarih aralığı ve konaklama sürenize uyan gidiş-dönüşleri Skyscanner
            öncelikli 19 kaynaktan tarayın; en ucuzu üstte görün.
          </p>

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

      {result && (
        <ResultsList
          offers={result.offers}
          sources={result.sources}
          message={result.message}
          demo={result.demo}
          datePairsSearched={result.datePairsSearched}
        />
      )}

      {!result && !loading && (
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-2 text-sm text-[var(--muted)]">
          <p>
            Varsayılan kalkış: İstanbul (IST). Anahtar yoksa demo fiyatlarla
            arayüz denenir; satın alma linkleri gerçek kaynak sitelerine gider.
          </p>
        </section>
      )}
    </main>
  );
}
