import type { DatePair } from "../dates";
import { buildDeepLink } from "../deep-links";
import type { ResultRow } from "../types";

export type FreePriceHit = {
  outboundDate: string;
  returnDate: string;
  stayDays: number;
  price: number;
  currency: "TRY";
  label: string;
};

function samplePairs(pairs: DatePair[], n: number): DatePair[] {
  if (pairs.length <= n) return pairs;
  const out: DatePair[] = [];
  const step = (pairs.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) {
    out.push(pairs[Math.round(i * step)]);
  }
  return out;
}

/**
 * Ücretsiz fiyat önizleme — ücretli API yok.
 * Google Flights public search’ten görünür TRY fiyatlarını best-effort okur.
 * CAPTCHA bypass YOK; engellenirse boş döner. mode: "preview".
 */
export async function peekFreePrices(
  origin: string,
  destination: string,
  pairs: DatePair[],
  nonstopOnly: boolean
): Promise<{ hits: FreePriceHit[]; error?: string }> {
  if (process.env.DISABLE_PUBLIC_PRICE_PEEK === "1") {
    return { hits: [], error: "DISABLE_PUBLIC_PRICE_PEEK=1" };
  }

  const sample = samplePairs(pairs, 3);
  if (!sample.length) return { hits: [] };

  let puppeteer: typeof import("puppeteer-core") | null = null;
  try {
    puppeteer = await import("puppeteer-core");
  } catch {
    return { hits: [], error: "puppeteer-core yok" };
  }

  const executablePath =
    process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";

  const hits: FreePriceHit[] = [];
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    // Paralel 3 sayfa (hız)
    const results = await Promise.all(
      sample.map(async (pair) => {
        const url = buildDeepLink("google-flights", {
          origin,
          destination,
          pair,
          nonstopOnly,
        });
        const page = await browser!.newPage();
        try {
          await page.setUserAgent(
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          );
          await page.setExtraHTTPHeaders({
            "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
          });
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 18_000,
          });
          await new Promise((r) => setTimeout(r, 2800));
          const content = await page.content();
          if (
            /unusual traffic|captcha|g-recaptcha/i.test(content) &&
            !/₺|TRY|TL/.test(content)
          ) {
            return { blocked: true as const, hit: null };
          }
          const prices = await page.evaluate(() => {
            const text = document.body?.innerText || "";
            const found: number[] = [];
            const re = /₺\s*([\d.\s]+)|([\d.\s]+)\s*(?:TL|TRY)/gi;
            let m: RegExpExecArray | null;
            while ((m = re.exec(text))) {
              const raw = (m[1] || m[2] || "").replace(/[.\s]/g, "");
              const n = parseInt(raw, 10);
              if (n >= 500 && n <= 250000) found.push(n);
            }
            return found;
          });
          if (!prices.length) return { blocked: false as const, hit: null };
          return {
            blocked: false as const,
            hit: {
              outboundDate: pair.departure,
              returnDate: pair.returnDate,
              stayDays: pair.stayDays,
              price: Math.min(...prices),
              currency: "TRY" as const,
              label: "Google Flights önizleme",
            },
          };
        } catch {
          return { blocked: false as const, hit: null };
        } finally {
          await page.close().catch(() => undefined);
        }
      })
    );

    let blocked = false;
    for (const r of results) {
      if (r.blocked) blocked = true;
      if (r.hit) hits.push(r.hit);
    }
    if (!hits.length && blocked) {
      return {
        hits,
        error: "Sayfa engeli / CAPTCHA — fiyat önizleme atlandı (bypass yok)",
      };
    }
  } catch (e) {
    return {
      hits,
      error: e instanceof Error ? e.message : "önizleme hatası",
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }

  return { hits };
}

/** Önizleme fiyatlarını OTA satırlarına uygula. */
export function applyPreviewPrices(
  rows: ResultRow[],
  hits: FreePriceHit[]
): ResultRow[] {
  if (!hits.length) return rows;
  const byKey = new Map(
    hits.map((h) => [`${h.outboundDate}|${h.returnDate}|${h.stayDays}`, h])
  );
  const preferOta = new Set([
    "skyscanner",
    "google-flights",
    "enuygun",
    "kayak",
    "kiwi",
    "momondo",
  ]);

  return rows.map((row) => {
    const hit = byKey.get(
      `${row.outboundDate}|${row.returnDate}|${row.stayDays}`
    );
    if (!hit) return row;
    if (!preferOta.has(row.sourceId)) return row;
    if (row.price != null && row.price <= hit.price) return row;
    return {
      ...row,
      price: hit.price,
      mode: "preview" as const,
    };
  });
}
