"use client";

import { CITIES } from "@/lib/cities";

export type SearchFormValues = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  stayDays: number[];
};

const STAY_OPTIONS = [2, 3, 4, 5, 7, 10, 14];

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

  return (
    <form
      className="anim-rise-delay w-full max-w-3xl rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[0_20px_50px_rgba(11,61,74,0.08)] backdrop-blur-md sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-[var(--sea-deep)]">Kalkış</span>
          <select
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--sea)]"
            value={values.origin}
            onChange={(e) => onChange({ ...values, origin: e.target.value })}
          >
            {CITIES.map((c) => (
              <option key={c.iata} value={c.iata}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-[var(--sea-deep)]">Varış</span>
          <select
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--sea)]"
            value={values.destination}
            onChange={(e) =>
              onChange({ ...values, destination: e.target.value })
            }
          >
            {CITIES.filter((c) => c.iata !== values.origin).map((c) => (
              <option key={c.iata} value={c.iata}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

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

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold text-[var(--sea-deep)]">
          Konaklama süresi (çoklu seçim)
        </legend>
        <div className="flex flex-wrap gap-2">
          {STAY_OPTIONS.map((day) => {
            const active = values.stayDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleStay(day)}
                aria-pressed={active}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--sea-deep)] text-white"
                    : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--sea)]"
                }`}
              >
                {day} gün
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={loading || values.stayDays.length === 0}
        className="mt-5 w-full rounded-xl bg-[var(--accent)] px-5 py-3.5 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
      >
        {loading ? "Aranıyor…" : "Ucuz uçuş bul"}
      </button>
    </form>
  );
}
