import { formatTrDateTime } from "@/lib/dates";
import type { FlightOffer } from "@/lib/types";

function formatPrice(price: number | null): string {
  if (price == null) return "Fiyat için siteye git";
  return (
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(price) + " / kişi"
  );
}

function modeLabel(mode: FlightOffer["mode"]): string {
  if (mode === "live") return "Canlı fiyat";
  if (mode === "demo") return "Demo";
  return "Link-out";
}

type Props = {
  offer: FlightOffer;
  rank?: number;
  highlight?: boolean;
};

export function FlightCard({ offer, rank, highlight }: Props) {
  return (
    <article
      className={`anim-rise rounded-xl border bg-white/85 p-4 transition hover:border-[var(--sea)] sm:p-5 ${
        highlight
          ? "border-[var(--sea-bright)] shadow-[0_12px_40px_rgba(21,122,140,0.18)]"
          : "border-[var(--line)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            {rank != null && (
              <span className="rounded bg-[var(--foam)] px-2 py-0.5 font-semibold text-[var(--sea-deep)]">
                #{rank}
              </span>
            )}
            <span className="rounded bg-[var(--sea-deep)]/90 px-2 py-0.5 font-semibold text-white">
              {offer.source}
            </span>
            <span className="rounded border border-[var(--line)] px-2 py-0.5">
              {modeLabel(offer.mode)}
            </span>
            <span>{offer.stayDays} gün konaklama</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-[var(--sea-deep)]">
            {offer.airline}
          </h3>
        </div>
        <p
          className={`text-right font-display text-xl font-semibold sm:text-2xl ${
            offer.price != null ? "text-[var(--accent)]" : "text-[var(--muted)]"
          }`}
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {formatPrice(offer.price)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Gidiş
          </p>
          <p className="mt-1 font-medium">
            {offer.outbound.from} → {offer.outbound.to}
          </p>
          <p className="text-[var(--muted)]">
            {formatTrDateTime(offer.outbound.departure)} →{" "}
            {formatTrDateTime(offer.outbound.arrival)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Dönüş
          </p>
          <p className="mt-1 font-medium">
            {offer.inbound.from} → {offer.inbound.to}
          </p>
          <p className="text-[var(--muted)]">
            {formatTrDateTime(offer.inbound.departure)} →{" "}
            {formatTrDateTime(offer.inbound.arrival)}
          </p>
        </div>
      </div>

      <a
        href={offer.purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-lg bg-[var(--sea)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sea-deep)]"
      >
        Satın al / siteye git
      </a>
    </article>
  );
}
