#!/usr/bin/env node
/**
 * OurAirports CSV → src/data/airports.json
 * Kaynak: https://davidmegginson.github.io/ourairports-data/airports.csv (açık veri)
 *
 * Kullanım: npx tsx scripts/build-airports.ts [/path/to/airports.csv]
 */
import { createReadStream, writeFileSync } from "fs";
import { createInterface } from "readline";
import path from "path";

type Row = Record<string, string>;

const CITY_OVERRIDE: Record<string, [string, string]> = {
  SAW: ["İstanbul", "Sabiha Gökçen"],
  IST: ["İstanbul", "İstanbul Havalimanı"],
  ADB: ["İzmir", "Adnan Menderes"],
  ESB: ["Ankara", "Esenboğa"],
  LGW: ["London", "Gatwick"],
  STN: ["London", "Stansted"],
  LTN: ["London", "Luton"],
  LCY: ["London", "City"],
  LHR: ["London", "Heathrow"],
  ORY: ["Paris", "Orly"],
  CDG: ["Paris", "Charles de Gaulle"],
  BVA: ["Paris", "Beauvais"],
  CIA: ["Rome", "Ciampino"],
  FCO: ["Rome", "Fiumicino"],
  EWR: ["New York", "Newark"],
  JFK: ["New York", "JFK"],
  LGA: ["New York", "LaGuardia"],
};

async function main() {
  const csvPath = process.argv[2] || "/tmp/airports.csv";
  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  const byIata = new Map<string, Row & { type: string }>();
  const rank: Record<string, number> = {
    large_airport: 0,
    medium_airport: 1,
    small_airport: 2,
  };

  for await (const line of rl) {
    if (!headers.length) {
      headers = parseCsvLine(line).map((h) => h.replace(/^"|"$/g, ""));
      continue;
    }
    const cols = parseCsvLine(line);
    const row: Row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || "").replace(/^"|"$/g, "");
    });
    const iata = (row.iata_code || "").trim().toUpperCase();
    if (iata.length !== 3 || !/^[A-Z]+$/.test(iata)) continue;
    const typ = row.type || "";
    const sched = (row.scheduled_service || "").toLowerCase() === "yes";
    if (
      typ !== "large_airport" &&
      typ !== "medium_airport" &&
      !(typ === "small_airport" && sched)
    ) {
      continue;
    }
    const prev = byIata.get(iata);
    if (prev && (rank[typ] ?? 9) >= (rank[prev.type] ?? 9)) continue;

    let city = (row.municipality || "").trim() || (row.name || "").trim();
    let airport = (row.name || "").trim();
    const country = (row.iso_country || "").trim().toUpperCase();
    if (CITY_OVERRIDE[iata]) {
      [city, airport] = CITY_OVERRIDE[iata];
    }
    byIata.set(iata, {
      iata,
      city,
      airport,
      country,
      search: [iata, city, airport, country].join(" ").toLowerCase(),
      type: typ,
    });
  }

  const out = [...byIata.values()]
    .map(({ type: _t, ...rest }) => rest)
    .sort((a, b) => {
      if (a.country !== b.country) {
        if (a.country === "TR") return -1;
        if (b.country === "TR") return 1;
        return a.country.localeCompare(b.country);
      }
      return a.city.localeCompare(b.city) || a.iata.localeCompare(b.iata);
    });

  const dest = path.join(
    process.cwd(),
    "src/data/airports.json"
  );
  writeFileSync(dest, JSON.stringify(out), "utf-8");
  console.log(`Wrote ${out.length} airports → ${dest}`);
}

/** Minimal CSV line parser for quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
