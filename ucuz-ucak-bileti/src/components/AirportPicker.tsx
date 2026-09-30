"use client";

import { useEffect, useId, useRef, useState } from "react";
import { foldText, searchAirports } from "@/lib/airports";

type Props = {
  label: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
};

export function AirportPicker({ label, value, onChange, placeholder }: Props) {
  const id = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState(() => searchAirports(value, 10));
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHits(searchAirports(query || value, 10));
  }, [query, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = searchAirports(value, 80).find(
    (a) => foldText(a.code) === foldText(value),
  );

  return (
    <div className="field" ref={wrapRef}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        autoComplete="off"
        placeholder={placeholder || "Şehir veya IATA"}
        value={open ? query : selected?.label || query || value}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery(selected?.label || value);
          setOpen(true);
        }}
      />
      {open && hits.length > 0 && (
        <ul className="picker-list" role="listbox">
          {hits.map((a) => (
            <li key={a.code}>
              <button
                type="button"
                className="picker-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(a.code);
                  setQuery(a.label);
                  setOpen(false);
                }}
              >
                <span className="picker-code">{a.code}</span>
                <span>{a.label}</span>
                {a.kind === "city" && (
                  <span className="picker-city-tag">tüm</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
