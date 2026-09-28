"use client";

import { useMemo, useState } from "react";
import { formatTrDate } from "@/lib/dates";
import type { ResultRow, SearchResponse, SourceStatus } from "@/lib/types";

type Props = {
  result: SearchResponse;
};

type SortKey = "smart" | "date" | "source" | "price";

export function ResultsTable({ result }: Props) {
  const sources = useMemo(
    () =>
      [...new Set(result.rows.map((r) => r.source))].sort((a, b) => {
        const pa =
          result.rows.find((r) => r.source === a)?.sourcePriority ?? 99;
        const pb =
          result.rows.find((r) => r.source === b)?.sourcePriority ?? 99;
        return pa - pb;
      }),
    [result.rows]
  );

  const stays = useMemo(
    () =>
      [...new Set(result.rows.map((r) => r.stayDays))].sort((a, b) => a - b),
    [result.rows]
  );

  const [sourceFilter, setSourceFilter] = useState<string | "all">("all");
  const [stayFilter, setStayFilter] = useState<number | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("smart");
  const [visible, setVisible] = useState(40);
  const [pricedOnly, setPricedOnly] = useState(false);

  const filtered = useMemo(() => {
    let rows = result.rows;
    if (sourceFilter !== "all") {
      rows = rows.filter((r) => r.source === sourceFilter);
    }
    if (stayFilter !== "all") {
      rows = rows.filter((r) => r.stayDays === stayFilter);
    }
    if (pricedOnly) {
      rows = rows.filter((r) => r.price != null);
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortKey === "price") {
        if (a.price != null && b.price != null && a.price !== b.price) {
          return a.price - b.price;
        }
        if (a.price != null && b.price == null) return -1;
        if (a.price == null && b.price != null) return 1;
      }
      if (sortKey === "source") {
        if (a.sourcePriority !== b.sourcePriority) {
          return a.sourcePriority - b.sourcePriority;
        }
      }
      if (sortKey === "date" || sortKey === "source" || sortKey === "price") {
        if (a.outboundDate !== b.outboundDate) {
          return a.outboundDate.localeCompare(b.outboundDate);
        }
        if (a.returnDate !== b.returnDate) {
          return a.returnDate.localeCompare(b.returnDate);
        }
        return a.sourcePriority - b.sourcePriority;
      }
      // smart: API sırası (zaten fiyat → tarih → kaynak)
      return 0;
    });
    return sorted;
  }, [result.rows, sourceFilter, stayFilter, sortKey, pricedOnly]);

  const shown = filtered.slice(0, visible);
  const hasAnyPrice = result.rows.some((r) => r.price != null);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4">
      {result.message && (
        <p className="mb-4 rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--sea-deep)]">
          {result.message}
        </p>
      )}

      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-[var(--sea-deep)]">
          Sonuç tablosu
        </h2>
        <p className="text-sm text-[var(--muted)]">
          {result.rowsTotal} satır · her satırda kaynak + gidiş + dönüş + süre
          + fiyat · farklı kaynaklar farklı tarihlerde olabilir
        </p>
      </div>

      {/* Kaynak başına özet — kendi tarihleriyle */}
      <div className="mb-6 overflow-x-auto rounded-xl border border-[var(--line)] bg-white/80">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="border-b border-[var(--line)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Kaynak başına en iyi satır (kendi tarihleri)
          </caption>
          <thead className="bg-[var(--foam)]/80 text-xs text-[var(--sea-deep)]">
            <tr>
              <th className="px-3 py-2 font-semibold">Kaynak</th>
              <th className="px-3 py-2 font-semibold">Gidiş</th>
              <th className="px-3 py-2 font-semibold">Dönüş</th>
              <th className="px-3 py-2 font-semibold">Süre</th>
              <th className="px-3 py-2 font-semibold">Fiyat</th>
              <th className="px-3 py-2 font-semibold">Link</th>
            </tr>
          </thead>
          <tbody>
            {result.cheapestPerSource.map((c) => (
              <tr
                key={c.source}
                className="border-t border-[var(--line)] hover:bg-[var(--foam)]/40"
              >
                <td className="px-3 py-2 font-medium">
                  <span className="mr-1 text-xs text-[var(--muted)]">
                    #{c.sourcePriority}
                  </span>
                  {c.source}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatTrDate(c.outboundDate)}
                  <span className="ml-1 text-xs text-[var(--muted)]">
                    {c.outboundDate}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatTrDate(c.returnDate)}
                  <span className="ml-1 text-xs text-[var(--muted)]">
                    {c.returnDate}
                  </span>
                </td>
                <td className="px-3 py-2">{c.stayDays} gün</td>
                <td className="px-3 py-2">
                  <PriceCell price={c.price} />
                </td>
                <td className="px-3 py-2">
                  <a
                    href={c.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--sea)] hover:underline"
                  >
                    Aç
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.overallCheapest && (
        <p className="mb-4 rounded-lg border border-[var(--accent-soft)] bg-[var(--accent-soft)]/35 px-4 py-3 text-sm text-[var(--sea-deep)]">
          <span className="font-semibold text-[var(--accent)]">
            Genel en ucuz:
          </span>{" "}
          {result.overallCheapest.source} ·{" "}
          {formatTrDate(result.overallCheapest.outboundDate)} →{" "}
          {formatTrDate(result.overallCheapest.returnDate)} (
          {result.overallCheapest.stayDays} gün) ·{" "}
          <PriceCell price={result.overallCheapest.price} />
        </p>
      )}

      {/* Filtreler */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--sea-deep)]">
          Kaynak
          <select
            className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm font-normal"
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setVisible(40);
            }}
          >
            <option value="all">Tümü ({sources.length})</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--sea-deep)]">
          Konaklama
          <select
            className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm font-normal"
            value={stayFilter === "all" ? "all" : String(stayFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setStayFilter(v === "all" ? "all" : Number(v));
              setVisible(40);
            }}
          >
            <option value="all">Tümü</option>
            {stays.map((d) => (
              <option key={d} value={d}>
                {d} gün
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--sea-deep)]">
          Sırala
          <select
            className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm font-normal"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="smart">Akıllı (fiyat → tarih → kaynak)</option>
            <option value="date">Gidiş tarihi</option>
            <option value="source">Kaynak önceliği</option>
            <option value="price">Fiyat</option>
          </select>
        </label>
        {hasAnyPrice && (
          <label className="flex items-center gap-2 pb-1.5 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={pricedOnly}
              onChange={(e) => {
                setPricedOnly(e.target.checked);
                setVisible(40);
              }}
            />
            Yalnızca fiyatlı
          </label>
        )}
      </div>

      <p className="mb-2 text-xs text-[var(--muted)]">
        Gösterilen {Math.min(visible, filtered.length)} / {filtered.length}{" "}
        filtreli satır
      </p>

      {/* Ana sonuç tablosu */}
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white/85 shadow-[0_8px_30px_rgba(11,61,74,0.06)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--sea-deep)] text-xs text-white">
            <tr>
              <th className="px-3 py-3 font-semibold">#</th>
              <th className="px-3 py-3 font-semibold">Kaynak</th>
              <th className="px-3 py-3 font-semibold">Gidiş</th>
              <th className="px-3 py-3 font-semibold">Dönüş</th>
              <th className="px-3 py-3 font-semibold">Süre</th>
              <th className="px-3 py-3 font-semibold">Fiyat</th>
              <th className="px-3 py-3 font-semibold">Satın al</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row, idx) => (
              <ResultTableRow key={row.id} row={row} rank={idx + 1} />
            ))}
            {!shown.length && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-10 text-center text-[var(--muted)]"
                >
                  Bu filtrede satır yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > visible && (
        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-[var(--line)] bg-white/80 py-3 text-sm font-semibold text-[var(--sea-deep)] hover:border-[var(--sea)]"
          onClick={() => setVisible((v) => v + 40)}
        >
          Daha fazla satır ({filtered.length - visible} kaldı)
        </button>
      )}

      <SourceLegend sources={result.sources} />
    </section>
  );
}

function ResultTableRow({ row, rank }: { row: ResultRow; rank: number }) {
  return (
    <tr className="border-t border-[var(--line)] hover:bg-[var(--foam)]/50">
      <td className="px-3 py-2.5 text-xs text-[var(--muted)]">{rank}</td>
      <td className="px-3 py-2.5">
        <span className="font-medium text-[var(--sea-deep)]">{row.source}</span>
        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
          öncelik {row.sourcePriority}
          {row.mode === "live" ? " · canlı" : ""}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="font-medium">{formatTrDate(row.outboundDate)}</span>
        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
          {row.outboundDate}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="font-medium">{formatTrDate(row.returnDate)}</span>
        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
          {row.returnDate}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">{row.stayDays} gün</td>
      <td className="px-3 py-2.5">
        <PriceCell price={row.price} />
      </td>
      <td className="px-3 py-2.5">
        <a
          href={row.purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-md bg-[var(--sea)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--sea-deep)]"
        >
          Siteye git
        </a>
      </td>
    </tr>
  );
}

function PriceCell({ price }: { price: number | null }) {
  if (price == null) {
    return (
      <span className="rounded border border-[var(--line)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
        Sitede gör
      </span>
    );
  }
  return (
    <span
      className="font-semibold text-[var(--accent)]"
      style={{ fontFamily: "var(--font-display), Georgia, serif" }}
    >
      {new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      }).format(price)}
    </span>
  );
}

function SourceLegend({ sources }: { sources: SourceStatus[] }) {
  return (
    <details className="mt-8 rounded-xl border border-[var(--line)] bg-white/60 p-4">
      <summary className="cursor-pointer font-semibold text-[var(--sea-deep)]">
        19 kaynak
      </summary>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {sources.map((s) => (
          <li key={s.id} className="border-b border-[var(--line)] pb-1 text-sm">
            <span className="text-xs text-[var(--muted)]">{s.priority}. </span>
            {s.name}
          </li>
        ))}
      </ul>
    </details>
  );
}
