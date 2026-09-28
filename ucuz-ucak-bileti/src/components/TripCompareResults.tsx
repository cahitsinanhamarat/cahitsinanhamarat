"use client";

import { useMemo, useState } from "react";
import { formatTrDate } from "@/lib/dates";
import type { SearchResponse, SourceStatus, TripOption } from "@/lib/types";

type Props = {
  result: SearchResponse;
};

export function TripCompareResults({ result }: Props) {
  const staysInResults = useMemo(() => {
    const s = [...new Set(result.tripOptions.map((t) => t.stayDays))].sort(
      (a, b) => a - b
    );
    return s;
  }, [result.tripOptions]);

  const [stayFilter, setStayFilter] = useState<number | "all">("all");
  const [visible, setVisible] = useState(24);

  const filtered = useMemo(() => {
    if (stayFilter === "all") return result.tripOptions;
    return result.tripOptions.filter((t) => t.stayDays === stayFilter);
  }, [result.tripOptions, stayFilter]);

  const shown = filtered.slice(0, visible);
  const hasPrice = filtered.some((t) => t.price != null);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4">
      {result.message && (
        <p className="mb-4 rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--sea-deep)]">
          {result.message}
        </p>
      )}

      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-[var(--sea-deep)]">
          Uygun tarih kombinasyonları
        </h2>
        <p className="text-sm text-[var(--muted)]">
          {result.tripOptionsTotal} çift
          {result.tripOptionsSampled
            ? ` · gösterilen ${result.tripOptions.length} (örneklenmiş)`
            : ""}{" "}
          ·{" "}
          {hasPrice
            ? "Canlı fiyat sinyali varsa en ucuz üstte"
            : "Kronolojik sıra · Skyscanner birincil link"}{" "}
          · Ücretsiz deep-link karşılaştırma
        </p>
      </div>

      {staysInResults.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip
            active={stayFilter === "all"}
            onClick={() => {
              setStayFilter("all");
              setVisible(24);
            }}
            label="Tümü"
          />
          {staysInResults.map((d) => (
            <FilterChip
              key={d}
              active={stayFilter === d}
              onClick={() => {
                setStayFilter(d);
                setVisible(24);
              }}
              label={`${d} gün`}
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {shown.map((trip, idx) => (
          <TripCard key={trip.id} trip={trip} rank={idx + 1} />
        ))}
      </div>

      {!shown.length && (
        <p className="rounded-lg border border-[var(--line)] bg-white/70 px-4 py-8 text-center text-[var(--muted)]">
          Bu filtrede tarih çifti yok.
        </p>
      )}

      {filtered.length > visible && (
        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-[var(--line)] bg-white/80 py-3 text-sm font-semibold text-[var(--sea-deep)] hover:border-[var(--sea)]"
          onClick={() => setVisible((v) => v + 24)}
        >
          Daha fazla göster ({filtered.length - visible} kaldı)
        </button>
      )}

      <SourceLegend sources={result.sources} />
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-[var(--sea-deep)] text-white"
          : "border border-[var(--line)] bg-white text-[var(--muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function TripCard({ trip, rank }: { trip: TripOption; rank: number }) {
  const [open, setOpen] = useState(false);
  const secondary = trip.links.slice(1);

  return (
    <article className="anim-rise rounded-xl border border-[var(--line)] bg-white/85 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span className="rounded bg-[var(--foam)] px-2 py-0.5 font-semibold text-[var(--sea-deep)]">
              #{rank}
            </span>
            <span className="rounded border border-[var(--line)] px-2 py-0.5 font-medium">
              {trip.stayDays} gün konaklama
            </span>
            {trip.price != null && (
              <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 font-semibold text-[var(--accent)]">
                ≈{" "}
                {new Intl.NumberFormat("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  maximumFractionDigits: 0,
                }).format(trip.price)}{" "}
                (canlı sinyal)
              </span>
            )}
          </div>
          <h3
            className="mt-2 text-lg font-semibold text-[var(--sea-deep)]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {formatTrDate(trip.departure)} → {formatTrDate(trip.returnDate)}
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Gidiş {trip.departure} · Dönüş {trip.returnDate}
          </p>
        </div>
        <a
          href={trip.primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-lg bg-[var(--sea)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sea-deep)]"
        >
          Skyscanner’da aç
        </a>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {trip.links.slice(0, 4).map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition hover:border-[var(--sea)] ${
              l.priority === 1
                ? "border-[var(--sea)] bg-[var(--foam)] text-[var(--sea-deep)]"
                : "border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {l.priority}. {l.name}
          </a>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs font-semibold text-[var(--sea-deep)]"
        >
          {open ? "Kaynakları gizle" : `+${secondary.length} kaynak daha`}
        </button>
      </div>

      {open && (
        <ul className="mt-3 grid gap-1.5 border-t border-[var(--line)] pt-3 text-sm sm:grid-cols-2">
          {trip.links.map((l) => (
            <li key={l.id}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--sea)] underline-offset-2 hover:underline"
              >
                {l.priority}. {l.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function SourceLegend({ sources }: { sources: SourceStatus[] }) {
  return (
    <details className="mt-8 rounded-xl border border-[var(--line)] bg-white/60 p-4">
      <summary className="cursor-pointer font-semibold text-[var(--sea-deep)]">
        19 kaynak (ücretsiz deep-link)
      </summary>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {sources.map((s) => (
          <li
            key={s.id}
            className="flex items-start gap-2 border-b border-[var(--line)] pb-2"
          >
            <span className="mt-0.5 w-6 shrink-0 text-xs text-[var(--muted)]">
              {s.priority}.
            </span>
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-[var(--muted)]">{s.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
