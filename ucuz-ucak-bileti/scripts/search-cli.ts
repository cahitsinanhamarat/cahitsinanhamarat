#!/usr/bin/env node
/**
 * CLI: npm run search -- --from IST --to AMS --start 2026-04-01 --end 2026-06-01 --stay 3,4
 */
import { runSearch } from "../src/lib/adapters";
import { normalizeStayDays } from "../src/lib/stays";

function arg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  const origin = (arg("from", "IST") || "IST").toUpperCase();
  const destination = (arg("to", "AMS") || "AMS").toUpperCase();
  const startDate = arg("start") || "2026-04-01";
  const endDate = arg("end") || "2026-06-01";
  const stay = normalizeStayDays(
    (arg("stay", "3,4") || "3,4").split(",").map((s) => Number(s.trim()))
  );
  const sourceFilter = arg("source");
  const limit = Number(arg("limit", "20")) || 20;

  if (!/^[A-Za-z]{3}$/.test(origin) || !/^[A-Za-z]{3}$/.test(destination)) {
    console.error("from/to must be 3-letter IATA codes");
    process.exit(1);
  }

  const result = await runSearch({
    origin,
    destination,
    startDate,
    endDate,
    stayDays: stay,
  });

  console.log(
    `\nUcuz Uçak Bileti — ${origin} → ${destination} | ${startDate} … ${endDate} | ${stay.join("/")} gün`
  );
  console.log(
    result.freePath
      ? "Mod: ÜCRETSİZ — satır başına kaynak + gidiş + dönüş + fiyat/sitede gör\n"
      : "Mod: deep-link + canlı satırlar\n"
  );
  if (result.message) console.log(result.message + "\n");

  console.log("--- Kaynak başına en iyi (kendi tarihleri) ---");
  for (const c of result.cheapestPerSource) {
    const price = c.price != null ? `${c.price} TRY` : "Sitede gör";
    console.log(
      `#${c.sourcePriority} ${c.source}: ${c.outboundDate} → ${c.returnDate} (${c.stayDays}g) | ${price}`
    );
  }

  let rows = result.rows;
  if (sourceFilter) {
    rows = rows.filter((r) =>
      r.source.toLowerCase().includes(sourceFilter.toLowerCase())
    );
  }

  console.log("\n--- Tablo ---");
  console.log("Kaynak | Gidiş | Dönüş | Süre | Fiyat | URL");
  for (const [i, r] of rows.slice(0, limit).entries()) {
    const price = r.price != null ? `${r.price} TRY` : "Sitede gör";
    console.log(
      `${i + 1}. ${r.source} | ${r.outboundDate} | ${r.returnDate} | ${r.stayDays}g | ${price}`
    );
    console.log(`   ${r.purchaseUrl}`);
  }
  if (rows.length > limit) {
    console.log(`\n… +${rows.length - limit} satır daha (toplam ${rows.length})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
