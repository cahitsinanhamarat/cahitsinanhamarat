import { buildDeepLink } from "../src/lib/deep-links";
import {
  AIRLINE_BOOK_TEMPLATES,
  APPROVED_SOURCES,
} from "../src/lib/sources";

const pair = {
  departure: "2026-04-15",
  returnDate: "2026-04-18",
  stayDays: 3,
};

async function check(id: string) {
  const url = buildDeepLink(id, {
    origin: "IST",
    destination: "AMS",
    pair,
    nonstopOnly: false,
  });
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "tr-TR,en;q=0.8",
      },
    });
    clearTimeout(t);
    const text = await res.text().catch(() => "");
    const soft404 =
      /page not found|404 not found|sayfa bulunamad|does not exist/i.test(
        text.slice(0, 8000)
      );
    let finalHost = "";
    try {
      finalHost = new URL(res.url).host;
    } catch {
      /* ignore */
    }
    return {
      id,
      status: res.status,
      finalHost,
      ok: res.status >= 200 && res.status < 400 && !soft404,
      soft404,
      url: url.slice(0, 110),
    };
  } catch (e) {
    return {
      id,
      status: 0,
      finalHost: "",
      ok: false,
      soft404: false,
      url: url.slice(0, 110),
      err: e instanceof Error ? e.name : "err",
    };
  }
}

async function runBatch(
  label: string,
  ids: string[],
  concurrency = 4
) {
  console.log(`=== ${label} ===`);
  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const rows = await Promise.all(chunk.map(check));
    for (const r of rows) {
      console.log(
        `${r.ok ? "OK" : "FAIL"}\t${r.status}\t${r.id}\t${r.finalHost}\t${"err" in r ? r.err : ""}\t${r.url}`
      );
    }
  }
}

async function main() {
  const ota = APPROVED_SOURCES.filter((s) => !s.id.startsWith("airline-")).map(
    (s) => s.id
  );
  const templated = APPROVED_SOURCES.filter(
    (s) => s.airlineIata && AIRLINE_BOOK_TEMPLATES[s.airlineIata]
  ).map((s) => s.id);

  await runBatch("OTA", ota);
  await runBatch("AIRLINES templated", templated, 5);
}

main();
