import type {
  AdapterSummary,
  FlightOffer,
  KeyPresence,
  SourceStatus,
} from "@/lib/types";
import { FlightCard } from "./FlightCard";

type Props = {
  offers: FlightOffer[];
  sources: SourceStatus[];
  message?: string;
  demo: boolean;
  datePairsSearched: number;
  keys?: KeyPresence;
  adapters?: AdapterSummary[];
};

export function ResultsList({
  offers,
  sources,
  message,
  demo,
  datePairsSearched,
  keys,
  adapters,
}: Props) {
  const priced = offers.filter((o) => o.price != null);
  const linkOuts = offers.filter((o) => o.price == null);
  const livePriced = priced.filter((o) => o.mode === "live");
  const otherPriced = priced.filter((o) => o.mode !== "live");
  const cheapest = priced[0];
  const alternatives = priced.slice(1);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4">
      {message && (
        <p className="mb-4 rounded-lg border border-[var(--accent-soft)] bg-[var(--accent-soft)]/40 px-4 py-3 text-sm text-[var(--sea-deep)]">
          {message}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--sea-deep)]">
            Sonuçlar
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {datePairsSearched} tarih çifti ·{" "}
            {demo
              ? "Demo fiyatlar"
              : `${livePriced.length} canlı + ${otherPriced.length} diğer fiyatlı`}{" "}
            · Sıra: canlı → en ucuz → Skyscanner önceliği
          </p>
          {keys && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Anahtarlar — Skyscanner: {keys.skyscanner ? "✓" : "✗"} · Kiwi:{" "}
              {keys.kiwi ? "✓" : "✗"} · Amadeus: {keys.amadeus ? "✓" : "✗"}
            </p>
          )}
        </div>
      </div>

      {cheapest && (
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            En ucuz seçenek
          </p>
          <FlightCard offer={cheapest} rank={1} highlight />
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="mb-10 space-y-3">
          <h3 className="text-lg font-semibold text-[var(--sea-deep)]">
            Diğer alternatifler
          </h3>
          {alternatives.map((o, idx) => (
            <FlightCard key={o.id} offer={o} rank={idx + 2} />
          ))}
        </div>
      )}

      {linkOuts.length > 0 && (
        <div className="mb-10 space-y-3">
          <h3 className="text-lg font-semibold text-[var(--sea-deep)]">
            Diğer kaynaklarda ara (link-out)
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Bu sitelerde canlı API yok; arama sayfasına yönlendirilirsiniz.
          </p>
          {linkOuts.map((o) => (
            <FlightCard key={o.id} offer={o} />
          ))}
        </div>
      )}

      {!offers.length && (
        <p className="rounded-lg border border-[var(--line)] bg-white/70 px-4 py-8 text-center text-[var(--muted)]">
          Sonuç bulunamadı. Tarihi veya varışı değiştirip tekrar deneyin.
        </p>
      )}

      {adapters && adapters.length > 0 && (
        <details className="mb-6 rounded-xl border border-[var(--line)] bg-white/60 p-4">
          <summary className="cursor-pointer font-semibold text-[var(--sea-deep)]">
            Canlı adaptör özeti
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {adapters.map((a) => (
              <li key={a.source}>
                <span className="font-medium">{a.source}</span>: {a.count} sonuç
                {a.error ? ` — ${a.error}` : a.ok ? " — OK" : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      <SourceLegend sources={sources} />
    </section>
  );
}

function SourceLegend({ sources }: { sources: SourceStatus[] }) {
  return (
    <details className="rounded-xl border border-[var(--line)] bg-white/60 p-4">
      <summary className="cursor-pointer font-semibold text-[var(--sea-deep)]">
        19 kaynak durumu
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
              <p className="font-medium">
                {s.name}{" "}
                <span className="text-xs font-normal text-[var(--muted)]">
                  (
                  {s.mode === "live"
                    ? "canlı"
                    : s.mode === "demo"
                      ? "demo"
                      : "link-out"}
                  )
                </span>
              </p>
              <p className="text-xs text-[var(--muted)]">{s.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
