"use client";

import { useDeferredValue, useEffect, useId, useRef, useState } from "react";
import {
  airportLabel,
  getAirport,
  searchAirports,
  type Airport,
} from "@/lib/airports";

type Props = {
  label: string;
  value: string; // IATA
  onChange: (iata: string) => void;
  excludeIata?: string;
};

export function AirportPicker({ label, value, onChange, excludeIata }: Props) {
  const listId = useId();
  const selected = getAirport(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(
    selected ? airportLabel(selected) : value
  );
  const deferredQuery = useDeferredValue(query);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = getAirport(value);
    if (a) setQuery(airportLabel(a));
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = searchAirports(deferredQuery, 50).filter(
    (a) => a.iata !== excludeIata?.toUpperCase()
  );

  function pick(a: Airport) {
    onChange(a.iata);
    setQuery(airportLabel(a));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-[var(--sea-deep)]">{label}</span>
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--sea)]"
        value={query}
        placeholder="Şehir veya IATA ara… (ör. İstanbul, AMS)"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && results[0]) {
            e.preventDefault();
            pick(results[0]);
          }
        }}
      />
      {selected && (
        <span className="text-xs text-[var(--muted)]">
          Seçili: {selected.city} · {selected.iata} · {selected.country}
          {selected.city === "İstanbul" || selected.city === "Istanbul"
            ? " (çoklu havalimanı: IST / SAW ayrı seçilir)"
            : ""}
        </span>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--line)] bg-white py-1 shadow-lg"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--muted)]">
              Sonuç yok — IATA veya şehir adı deneyin
            </li>
          )}
          {results.map((a) => (
            <li key={a.iata} role="option">
              <button
                type="button"
                className={`flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--foam)] ${
                  a.iata === value ? "bg-[var(--foam)]" : ""
                }`}
                onClick={() => pick(a)}
              >
                <span className="font-medium text-[var(--sea-deep)]">
                  {a.city}{" "}
                  <span className="text-[var(--accent)]">({a.iata})</span>
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {a.airport} · {a.country}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
