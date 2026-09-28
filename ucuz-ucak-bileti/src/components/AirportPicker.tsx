"use client";

import {
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  airportLabel,
  getAirport,
  searchAirports,
  type Airport,
} from "@/lib/airports";

type Props = {
  label: string;
  value: string;
  onChange: (iata: string) => void;
  excludeIata?: string;
};

/**
 * Aramalı havalimanı seçici.
 * Önemli: liste öğelerinde onMouseDown + preventDefault —
 * aksi halde document mousedown dropdown’u click’ten önce kapatır (seçim bozulur).
 */
export function AirportPicker({ label, value, onChange, excludeIata }: Props) {
  const listId = useId();
  const selected = getAirport(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() =>
    selected ? airportLabel(selected) : value || ""
  );
  const [highlight, setHighlight] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickingRef = useRef(false);

  // Dışarıdan value değişince (ör. varsayılan IST) etiketi senkronla —
  // kullanıcı yazarken ezme
  useEffect(() => {
    if (pickingRef.current) return;
    if (open) return;
    const a = getAirport(value);
    setQuery(a ? airportLabel(a) : value || "");
  }, [value, open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (pickingRef.current) return;
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        // Seçili değeri geri yaz
        const a = getAirport(value);
        if (a) setQuery(airportLabel(a));
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [value]);

  const results = searchAirports(
    // Seçili tam etiket görünürken arama için IATA kullan
    open && selected && query === airportLabel(selected) ? selected.iata : deferredQuery,
    50
  ).filter((a) => a.iata !== excludeIata?.toUpperCase());

  useEffect(() => {
    setHighlight(0);
  }, [deferredQuery, open]);

  function pick(a: Airport) {
    pickingRef.current = true;
    onChange(a.iata);
    setQuery(airportLabel(a));
    setOpen(false);
    // blur sonra picking kilidini aç
    requestAnimationFrame(() => {
      pickingRef.current = false;
      inputRef.current?.blur();
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      const a = getAirport(value);
      if (a) setQuery(airportLabel(a));
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, results.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const choice = results[highlight] ?? results[0];
      if (choice) pick(choice);
    }
  }

  return (
    <div ref={rootRef} className="relative z-20 flex flex-col gap-1.5 text-sm">
      <label className="font-semibold text-[var(--sea-deep)]" htmlFor={listId + "-input"}>
        {label}
      </label>
      <input
        id={listId + "-input"}
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[highlight] ? `${listId}-${results[highlight].iata}` : undefined
        }
        autoComplete="off"
        className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--sea)]"
        value={query}
        placeholder="Şehir veya IATA ara… (ör. İstanbul, AMS)"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          // Odaklanınca mevcut etiketi seç — kullanıcı hemen yazabilsin
          inputRef.current?.select();
        }}
        onKeyDown={onKeyDown}
      />
      {selected && !open && (
        <span className="text-xs text-[var(--muted)]">
          Seçili: <strong>{selected.iata}</strong> · {selected.city} ·{" "}
          {selected.country}
        </span>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%-0.25rem)] z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--line)] bg-white py-1 shadow-lg"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--muted)]">
              Sonuç yok — IATA veya şehir adı deneyin
            </li>
          )}
          {results.map((a, idx) => (
            <li
              key={a.iata}
              id={`${listId}-${a.iata}`}
              role="option"
              aria-selected={a.iata === value}
            >
              <button
                type="button"
                tabIndex={-1}
                className={`flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--foam)] ${
                  idx === highlight || a.iata === value
                    ? "bg-[var(--foam)]"
                    : ""
                }`}
                onMouseDown={(e) => {
                  // Kritik: mousedown default’u engelle — input blur/doc close click’i yutmasın
                  e.preventDefault();
                  e.stopPropagation();
                  pick(a);
                }}
                onMouseEnter={() => setHighlight(idx)}
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
