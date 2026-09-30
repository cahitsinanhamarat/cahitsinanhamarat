"use client";

import { formatTrDisplayDate, formatTry } from "@/lib/dates";
import type { Offer, SearchResponse, SourceReport } from "@/lib/types";

function timePart(isoLocal: string): string {
  const t = isoLocal.split("T")[1];
  return t ? t.slice(0, 5) : "";
}

function datePart(isoLocal: string): string {
  return formatTrDisplayDate(isoLocal.slice(0, 10));
}

function OfferRow({ offer, index }: { offer: Offer; index: number }) {
  return (
    <article
      className="offer"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div className="offer-price">
        <strong>{formatTry(offer.totalPriceTry)}</strong>
        <span className="offer-source">{offer.sourceName}</span>
        {offer.sourceName.includes("ENUYGUN") &&
          offer.sourceId !== "enuygun" && (
            <span className="badge-via">OTA üzerinden · doğrulanmış</span>
          )}
        {offer.priceKind === "conditional" && (
          <span className="badge-conditional">Koşullu indirim ayrı</span>
        )}
      </div>
      <div className="offer-legs">
        <LegBlock title="Gidiş" offer={offer} outbound />
        <LegBlock title="Dönüş" offer={offer} outbound={false} />
      </div>
      <div className="offer-meta">
        <span>{offer.stayDays} gün konaklama</span>
        {offer.outbound.baggageChecked && (
          <span>Bagaj gidiş: {offer.outbound.baggageChecked}</span>
        )}
        {offer.inbound.baggageChecked && (
          <span>Bagaj dönüş: {offer.inbound.baggageChecked}</span>
        )}
        {offer.outbound.farePackage && (
          <span>Paket: {offer.outbound.farePackage}</span>
        )}
      </div>
      {offer.conditionalDiscounts.length > 0 && (
        <ul className="discount-list">
          {offer.conditionalDiscounts.map((d, i) => (
            <li key={i}>
              {d.label}
              {d.amountTry ? ` (−${formatTry(d.amountTry)})` : ""}
              {d.note ? ` — ${d.note}` : ""}
            </li>
          ))}
        </ul>
      )}
      <a className="offer-link" href={offer.bookingUrl} target="_blank" rel="noreferrer">
        Kaynakta aç / rezerve et
      </a>
    </article>
  );
}

function LegBlock({
  title,
  offer,
  outbound,
}: {
  title: string;
  offer: Offer;
  outbound: boolean;
}) {
  const leg = outbound ? offer.outbound : offer.inbound;
  return (
    <div className="leg">
      <div className="leg-title">
        {title} · {leg.airlineName} {leg.flightNumber}
      </div>
      <div className="leg-route">
        <span>
          {leg.origin} {timePart(leg.departAt)}
        </span>
        <span className="leg-arrow" aria-hidden>
          →
        </span>
        <span>
          {leg.destination} {timePart(leg.arriveAt)}
        </span>
      </div>
      <div className="leg-date">{datePart(leg.departAt)}</div>
      <div className="leg-extra">
        {leg.stops === 0 ? "Aktarmasız" : `${leg.stops} aktarma`} ·{" "}
        {leg.durationMinutes} dk
      </div>
    </div>
  );
}

function SourceStatusList({ sources }: { sources: SourceReport[] }) {
  return (
    <div className="source-status">
      <h2>Kaynak durumu</h2>
      <ul>
        {sources.map((s) => (
          <li key={s.id}>
            <span className={`status-pill status-${s.status}`}>{s.status}</span>
            <strong>{s.name}</strong>
            <span className="muted">
              {s.realPriceVerified ? " · gerçek fiyat doğrulandı" : " · fiyat doğrulanmadı"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResultsPanel({
  data,
  error,
  loading,
}: {
  data: SearchResponse | null;
  error: string | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="results-state" aria-live="polite">
        <div className="pulse" />
        <p>ENUYGUN üzerinden doğrulanmış gidiş-dönüş fiyatları okunuyor…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="results-state error" role="alert">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="results-state muted">
        Arama yaptığınızda doğrulanmış teklifler burada, toplam fiyata göre
        ucuzdan pahalıya listelenir. Uydurma fiyat gösterilmez.
      </div>
    );
  }

  return (
    <div className="results">
      <header className="results-header">
        <h2>
          {data.offers.length} doğrulanmış teklif · ucuz → pahalı
        </h2>
        <p className="muted">{data.meta.note}</p>
        {(data.meta.airportCount || data.meta.cityGroupCount) && (
          <p className="muted">
            Havalimanı verisi: {data.meta.airportCount ?? 0} IATA ·{" "}
            {data.meta.cityGroupCount ?? 0} “tüm havalimanları” şehir grubu
          </p>
        )}
        <p className="muted">
          Taranan tarih çiftleri:{" "}
          {data.searchedPairs
            .map((p) => `${p.depart}→${p.return}`)
            .join(" · ") || "—"}
        </p>
        {data.errors.length > 0 && (
          <details className="errors">
            <summary>{data.errors.length} kaynak uyarısı</summary>
            <ul>
              {data.errors.map((e, i) => (
                <li key={i}>
                  {e.sourceId}: {e.message}
                </li>
              ))}
            </ul>
          </details>
        )}
      </header>
      <div className="offer-list">
        {data.offers.map((o, i) => (
          <OfferRow key={o.id} offer={o} index={i} />
        ))}
        {data.offers.length === 0 && (
          <p className="results-state">
            Bu aralıkta doğrulanmış teklif bulunamadı. Tarihleri genişletin.
          </p>
        )}
      </div>
      <SourceStatusList sources={data.sources} />
    </div>
  );
}
