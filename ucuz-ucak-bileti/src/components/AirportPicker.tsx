"use client";

import {
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  placeLabel,
  searchPlaces,
  type PlaceSuggestion,
} from "@/lib/places";

type Props = {
  label: string;
  value: string;
  onChange: (code: string) => void;
  excludeCode?: string;
};

function suggestionKey(s: PlaceSuggestion): string {
  return s.kind === "city" ? s.group.code : s.airport.iata;
}

function suggestionLabel(s: PlaceSuggestion): string {
  if (s.kind === "city") {
    return `${s.group.label} · ${s.group.airports.map((a) => a.iata).join(", ")}`;
  }
  return `${s.airport.city} — ${s.airport.airport} (${s.airport.iata})`;
}

/**
 * Aramalı yer seçici — tek IATA veya “şehir (tüm havalimanları)”.
 * Liste: onMouseDown + preventDefault (seçim bozulmasın).
 */
export function AirportPicker({
  label,
  value,
  onChange,
  excludeCode,
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() =>
    value ? placeLabel(value) : ""
  );
  const [highlight, setHighlight] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickingRef = useRef(false);

  useEffect(() => {
    if (pickingRef.current) return;
    if (open) return;
    setQuery(value ? placeLabel(value) : "");
  }, [value, open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (pickingRef.current) return;
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        if (value) setQuery(placeLabel(value));
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [value]);

  const searchQ =
    open && value && query === placeLabel(value)
      ? // Seçili etiket görünürken şehir adıyla ara (İstanbul → tüm + IST/SAW)
        value.startsWith("CITY:")
        ? value.split(":").slice(2).join(" ").replace(/-/g, " ")
        : value
      : deferredQuery;

  const results = searchPlaces(searchQ, 50).filter((s) => {
    const key = suggestionKey(s);
    if (!excludeCode) return true;
    if (key.toLowerCase() === excludeCode.toLowerCase()) return false;
    // Şehir vs üye IATA çakışmasını UI’da bırak — kullanıcı seçebilir;
    // API overlap kontrolü yapar
    return true;
  });

  useEffect(() => {
    setHighlight(0);
  }, [deferredQuery, open]);

  function pick(s: PlaceSuggestion) {
    pickingRef.current = true;
    const code = suggestionKey(s);
    onChange(code);
    setQuery(suggestionLabel(s));
    setOpen(false);
    requestAnimationFrame(() => {
      pickingRef.current = false;
      inputRef.current?.blur();
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      if (value) setQuery(placeLabel(value));
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
      <label
        className="font-semibold text-[var(--sea-deep)]"
        htmlFor={listId + "-input"}
      >
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
          open && results[highlight]
            ? `${listId}-${suggestionKey(results[highlight])}`
            : undefined
        }
        autoComplete="off"
        className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--sea)]"
        value={query}
        placeholder="Şehir veya IATA… (ör. İstanbul → tüm / IST / SAW)"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          inputRef.current?.select();
        }}
        onKeyDown={onKeyDown}
      />
      {value && !open && (
        <span className="text-xs text-[var(--muted)]">
          Seçili: {placeLabel(value)}
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
          {results.map((s, idx) => {
            const key = suggestionKey(s);
            const selected = key.toLowerCase() === value.toLowerCase();
            return (
              <li
                key={key}
                id={`${listId}-${key}`}
                role="option"
                aria-selected={selected}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className={`flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--foam)] ${
                    idx === highlight || selected ? "bg-[var(--foam)]" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    pick(s);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  {s.kind === "city" ? (
                    <>
                      <span className="font-medium text-[var(--sea-deep)]">
                        {s.group.city}{" "}
                        <span className="text-[var(--accent)]">
                          (tüm havalimanları)
                        </span>
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {s.group.airports.map((a) => a.iata).join(" · ")} ·{" "}
                        {s.group.country}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-[var(--sea-deep)]">
                        {s.airport.city}{" "}
                        <span className="text-[var(--accent)]">
                          ({s.airport.iata})
                        </span>
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {s.airport.airport} · {s.airport.country}
                      </span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
