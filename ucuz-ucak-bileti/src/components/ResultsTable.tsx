"use client";

import { useMemo, useState } from "react";
import { formatTrDate } from "@/lib/dates";
import { stopsLabel } from "@/lib/deep-links";
import { sortResultRows } from "@/lib/sort-results";
import type { ResultRow, SearchResponse, SourceStatus } from "@/lib/types";

type Props = {
  result: SearchResponse;
};

type SortKey = "price" | "date" | "source";

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
  /** Varsayılan: fiyat ucuz → pahalı (kaynak kıran) */
  const [sortKey, setSortKey] = useState<SortKey>("price");
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
    if (sortKey === "price") {
      sorted.sort(sortResultRows);
    } else if (sortKey === "source") {
      sorted.sort((a, b) => {
        if (a.sourcePriority !== b.sourcePriority) {
          return a.sourcePriority - b.sourcePriority;
        }
        return sortResultRows(a, b);
      });
    } else {
      // date
      sorted.sort((a, b) => {
        if (a.outboundDate !== b.outboundDate) {
          return a.outboundDate.localeCompare(b.outboundDate);
        }
        if (a.returnDate !== b.returnDate) {
          return a.returnDate.localeCompare(b.returnDate);
        }
        return sortResultRows(a, b);
      });
    }
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
          {result.rowsTotal} satır · {result.sourceCount} kaynak (
          {result.airlineCount} havayolu) · sıralama: fiyat ucuz → pahalı
          (fiyatsız sonda; eşit fiyatta Skyscanner önceliği) · aktarma / kaynaklı
          {result.nonstopOnly ? " · yalnızca aktarmasız niyeti" : ""}
        </p>
      </div>

      <div className="mb-6 overflow-x-auto rounded-xl border border-[var(--line)] bg-white/80">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="border-b border-[var(--line)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Kaynak başına en iyi satır — fiyat ucuz → pahalı (kaynaklı)
          </caption>
          <thead className="bg-[var(--foam)]/80 text-xs text-[var(--sea-deep)]">
            <tr>
              <th className="px-3 py-2 font-semibold">Kaynak</th>
              <th className="px-3 py-2 font-semibold">Gidiş</th>
              <th className="px-3 py-2 font-semibold">Dönüş</th>
              <th className="px-3 py-2 font-semibold">Süre</th>
              <th className="px-3 py-2 font-semibold">Aktarma</th>
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
                  <StopsBadge stops={c.stops} stopCount={null} />
                </td>
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
          <StopsBadge
            stops={result.overallCheapest.stops}
            stopCount={result.overallCheapest.stopCount}
          />{" "}
          · <PriceCell price={result.overallCheapest.price} />
        </p>
      )}

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
            <option value="price">Fiyat (ucuz → pahalı)</option>
            <option value="date">Gidiş tarihi</option>
            <option value="source">Kaynak önceliği</option>
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

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white/85 shadow-[0_8px_30px_rgba(11,61,74,0.06)]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-[var(--sea-deep)] text-xs text-white">
            <tr>
              <th className="px-3 py-3 font-semibold">#</th>
              <th className="px-3 py-3 font-semibold">Kaynak</th>
              <th className="px-3 py-3 font-semibold">Gidiş</th>
              <th className="px-3 py-3 font-semibold">Dönüş</th>
              <th className="px-3 py-3 font-semibold">Süre</th>
              <th className="px-3 py-3 font-semibold">Aktarma</th>
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
                  colSpan={8}
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

      <SourceLegend
        sources={result.sources}
        sourceCount={result.sourceCount}
        airlineCount={result.airlineCount}
      />
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
          {row.mode === "live"
            ? " · canlı"
            : row.mode === "preview"
              ? " · önizleme"
              : ""}
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
        <StopsBadge stops={row.stops} stopCount={row.stopCount} />
      </td>
      <td className="px-3 py-2.5">
        <PriceCell price={row.price} mode={row.mode} />
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

function StopsBadge({
  stops,
  stopCount,
}: {
  stops: ResultRow["stops"];
  stopCount: number | null;
}) {
  const label = stopsLabel(stops, stopCount);
  const tone =
    stops === "nonstop"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : stops === "connecting"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-[var(--line)] bg-white text-[var(--muted)]";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${tone}`}
      title={
        stops === "nonstop"
          ? "Arama aktarmasız niyeti / deep-link stops=0"
          : stops === "connecting"
            ? "Aktarmalı uçuş"
            : "Kesin stop sayısı kaynak sitesinde"
      }
    >
      {label}
    </span>
  );
}

function PriceCell({
  price,
  mode,
}: {
  price: number | null;
  mode?: ResultRow["mode"];
}) {
  if (price == null) {
    return (
      <span className="rounded border border-[var(--line)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
        Sitede gör
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col">
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
      {mode === "preview" && (
        <span className="text-[10px] text-[var(--muted)]">önizleme</span>
      )}
    </span>
  );
}

function SourceLegend({
  sources,
  sourceCount,
  airlineCount,
}: {
  sources: SourceStatus[];
  sourceCount: number;
  airlineCount: number;
}) {
  return (
    <details className="mt-8 rounded-xl border border-[var(--line)] bg-white/60 p-4">
      <summary className="cursor-pointer font-semibold text-[var(--sea-deep)]">
        {sourceCount} kaynak · {airlineCount} havayolu (Skyscanner #1)
      </summary>
      <ul className="mt-3 grid max-h-80 gap-2 overflow-y-auto text-sm sm:grid-cols-2">
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
