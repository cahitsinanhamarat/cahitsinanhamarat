"use client";

import { useMemo, useState } from "react";
import { AirportPicker } from "./AirportPicker";
import type { SearchResponse } from "@/lib/types";

type Props = {
  onResult: (data: SearchResponse | null, error: string | null) => void;
  onLoading: (v: boolean) => void;
};

function defaultEarliest(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 14);
  return d.toISOString().slice(0, 10);
}

function defaultLatest(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 28);
  return d.toISOString().slice(0, 10);
}

export function SearchForm({ onResult, onLoading }: Props) {
  const [origin, setOrigin] = useState("ISTA");
  const [destination, setDestination] = useState("AYT");
  const [earliest, setEarliest] = useState(defaultEarliest);
  const [latest, setLatest] = useState(defaultLatest);
  const [minStay, setMinStay] = useState(3);
  const [maxStay, setMaxStay] = useState(7);
  const [adults, setAdults] = useState(1);
  const [busy, setBusy] = useState(false);

  const stayHint = useMemo(() => {
    if (minStay > maxStay) return "Min konaklama, max’tan büyük olamaz.";
    return `${minStay}–${maxStay} gün konaklama · gidiş-dönüş toplam fiyat`;
  }, [minStay, maxStay]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onLoading(true);
    onResult(null, null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          earliest,
          latest,
          minStayDays: minStay,
          maxStayDays: maxStay,
          adults,
          maxDatePairs: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onResult(null, data.error || "Arama başarısız");
      } else {
        onResult(data as SearchResponse, null);
      }
    } catch (err) {
      onResult(null, err instanceof Error ? err.message : "Ağ hatası");
    } finally {
      setBusy(false);
      onLoading(false);
    }
  }

  return (
    <form className="search-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <AirportPicker
          label="Nereden"
          value={origin}
          onChange={setOrigin}
          placeholder="İstanbul"
        />
        <AirportPicker
          label="Nereye"
          value={destination}
          onChange={setDestination}
          placeholder="Antalya"
        />
        <div className="field">
          <label htmlFor="earliest">En erken gidiş</label>
          <input
            id="earliest"
            className="input"
            type="date"
            value={earliest}
            onChange={(e) => setEarliest(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="latest">En geç dönüş</label>
          <input
            id="latest"
            className="input"
            type="date"
            value={latest}
            onChange={(e) => setLatest(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="minStay">Min konaklama (gün)</label>
          <input
            id="minStay"
            className="input"
            type="number"
            min={1}
            max={30}
            value={minStay}
            onChange={(e) => setMinStay(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="maxStay">Max konaklama (gün)</label>
          <input
            id="maxStay"
            className="input"
            type="number"
            min={1}
            max={30}
            value={maxStay}
            onChange={(e) => setMaxStay(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="adults">Yetişkin</label>
          <input
            id="adults"
            className="input"
            type="number"
            min={1}
            max={9}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
          />
        </div>
      </div>
      <p className="form-hint">{stayHint}</p>
      <button className="cta" type="submit" disabled={busy || minStay > maxStay}>
        {busy ? "Doğrulanmış fiyatlar aranıyor…" : "En ucuz gidiş-dönüşü bul"}
      </button>
    </form>
  );
}
