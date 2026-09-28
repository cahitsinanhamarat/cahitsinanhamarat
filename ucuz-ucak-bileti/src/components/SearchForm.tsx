"use client";

import { AirportPicker } from "@/components/AirportPicker";
import { AIRPORT_COUNT } from "@/lib/airports";
import { DEFAULT_STAY_DAYS, STAY_OPTIONS } from "@/lib/stays";

export type SearchFormValues = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  stayDays: number[];
};

export { DEFAULT_STAY_DAYS };

type Props = {
  values: SearchFormValues;
  onChange: (next: SearchFormValues) => void;
  onSubmit: () => void;
  loading: boolean;
};

export function SearchForm({ values, onChange, onSubmit, loading }: Props) {
  function toggleStay(day: number) {
    const has = values.stayDays.includes(day);
    const stayDays = has
      ? values.stayDays.filter((d) => d !== day)
      : [...values.stayDays, day].sort((a, b) => a - b);
    onChange({ ...values, stayDays });
  }

  function selectPreset(days: number[]) {
    onChange({ ...values, stayDays: [...days] });
  }

  return (
    <form
      className="anim-rise-delay w-full max-w-3xl rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[0_20px_50px_rgba(11,61,74,0.08)] backdrop-blur-md sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AirportPicker
          label="Kalkış"
          value={values.origin}
          excludeIata={values.destination}
          onChange={(iata) => onChange({ ...values, origin: iata })}
        />
        <AirportPicker
          label="Varış"
          value={values.destination}
          excludeIata={values.origin}
          onChange={(iata) => onChange({ ...values, destination: iata })}
        />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-[var(--sea-deep)]">
            Aralık başlangıcı
          </span>
          <input
            type="date"
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--sea)]"
            value={values.startDate}
            onChange={(e) =>
              onChange({ ...values, startDate: e.target.value })
            }
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-[var(--sea-deep)]">
            Aralık bitişi
          </span>
          <input
            type="date"
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--sea)]"
            value={values.endDate}
            onChange={(e) => onChange({ ...values, endDate: e.target.value })}
            required
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        {AIRPORT_COUNT.toLocaleString("tr-TR")} havalimanı / şehir (OurAirports
        açık veri). Yazarak arayın — düz &lt;select&gt; değil. Çoklu havalimanlı
        şehirler ayrı kodlarla (ör. İstanbul IST / SAW).
      </p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold text-[var(--sea-deep)]">
          Konaklama süresi — 2…21 gün (çoklu seçim)
        </legend>
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            className="rounded border border-[var(--line)] px-2 py-1 text-[var(--muted)] hover:border-[var(--sea)]"
            onClick={() => selectPreset([3, 4])}
          >
            3+4 gün
          </button>
          <button
            type="button"
            className="rounded border border-[var(--line)] px-2 py-1 text-[var(--muted)] hover:border-[var(--sea)]"
            onClick={() => selectPreset([7])}
          >
            1 hafta
          </button>
          <button
            type="button"
            className="rounded border border-[var(--line)] px-2 py-1 text-[var(--muted)] hover:border-[var(--sea)]"
            onClick={() => selectPreset([...STAY_OPTIONS])}
          >
            Tümü (2–21)
          </button>
          <button
            type="button"
            className="rounded border border-[var(--line)] px-2 py-1 text-[var(--muted)] hover:border-[var(--sea)]"
            onClick={() => selectPreset([])}
          >
            Temizle
          </button>
        </div>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto sm:max-h-none">
          {STAY_OPTIONS.map((day) => {
            const active = values.stayDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleStay(day)}
                aria-pressed={active}
                className={`min-w-[2.75rem] rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--sea-deep)] text-white"
                    : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--sea)]"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Seçili:{" "}
          {values.stayDays.length
            ? values.stayDays.map((d) => `${d}g`).join(", ")
            : "yok — en az bir süre seçin"}
        </p>
      </fieldset>

      <button
        type="submit"
        disabled={loading || values.stayDays.length === 0}
        className="mt-5 w-full rounded-xl bg-[var(--accent)] px-5 py-3.5 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
      >
        {loading ? "Tarihler taranıyor…" : "Tarihleri tara & karşılaştır"}
      </button>
    </form>
  );
}
