#!/usr/bin/env node
/**
 * CLI: npx tsx scripts/search-cli.ts --from IST --to AMS --start 2026-04-01 --end 2026-06-01 --stay 3,4
 */
import { runSearch } from "../src/lib/adapters";

function arg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  const origin = (arg("from", "IST") || "IST").toUpperCase();
  const destination = (arg("to", "AMS") || "AMS").toUpperCase();
  const startDate = arg("start") || defaultStart();
  const endDate = arg("end") || defaultEnd();
  const stay = (arg("stay", "3,4") || "3,4")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n > 0);

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
    result.demo
      ? "Mod: DEMO (API anahtarı yok)\n"
      : "Mod: canlı + link-out\n"
  );
  if (result.message) console.log(result.message + "\n");

  const priced = result.offers.filter((o) => o.price != null);
  const linkOuts = result.offers.filter((o) => o.price == null);

  for (const [i, o] of priced.entries()) {
    console.log(
      `${i + 1}. ${o.price} ${o.currency} | ${o.airline} | ${o.source} | ${o.stayDays}g | ${o.purchaseUrl}`
    );
  }
  if (linkOuts.length) {
    console.log("\n--- Link-out kaynaklar ---");
    for (const o of linkOuts) {
      console.log(`• ${o.source}: ${o.purchaseUrl}`);
    }
  }
}

function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return d.toISOString().slice(0, 10);
}
function defaultEnd() {
  const d = new Date();
  d.setDate(d.getDate() + 81);
  return d.toISOString().slice(0, 10);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
