#!/usr/bin/env node
/**
 * CLI: npm run search -- --from IST --to AMS --start 2026-04-01 --end 2026-06-01 --stay 3,4
 * Stay: 2–21, virgülle çoklu (örn. 2,3,4 veya 7)
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
      ? "Mod: ÜCRETSİZ deep-link karşılaştırma\n"
      : "Mod: deep-link + isteğe bağlı canlı fiyat\n"
  );
  if (result.message) console.log(result.message + "\n");

  const limit = Number(arg("limit", "15")) || 15;
  for (const [i, t] of result.tripOptions.slice(0, limit).entries()) {
    const price =
      t.price != null ? ` ≈${t.price} TRY` : "";
    console.log(
      `${i + 1}. ${t.departure} → ${t.returnDate} (${t.stayDays}g)${price}`
    );
    console.log(`   Skyscanner: ${t.primaryUrl}`);
    console.log(
      `   Diğer: ${t.links
        .slice(1, 5)
        .map((l) => l.name)
        .join(", ")}… (+${Math.max(0, t.links.length - 5)} kaynak)`
    );
  }

  if (result.tripOptions.length > limit) {
    console.log(`\n… +${result.tripOptions.length - limit} tarih çifti daha`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
