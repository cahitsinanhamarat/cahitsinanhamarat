"use client";

import { useState } from "react";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SearchForm } from "@/components/SearchForm";
import type { SearchResponse } from "@/lib/types";

export function HomeClient() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-inner">
          <p className="brand">Ucuz Uçak Bileti</p>
          <h1>Türkiye çıkışlı gidiş-dönüşü gerçek fiyatla karşılaştır</h1>
          <p className="lede">
            Doğrulanmış toplam fiyat · ucuzdan pahalıya. Uydurma rakam yok;
            koşullu indirimler ayrı etiketlenir.
          </p>
          <SearchForm
            onLoading={setLoading}
            onResult={(d, e) => {
              setData(d);
              setError(e);
            }}
          />
        </div>
      </section>
      <section className="results-section">
        <ResultsPanel data={data} error={error} loading={loading} />
      </section>
    </>
  );
}
