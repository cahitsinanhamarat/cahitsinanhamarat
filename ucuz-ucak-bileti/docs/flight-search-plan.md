# Ucuz Uçak Bileti — Arama Planı (ücretsiz yol)

Türkiye çıkışlı ucuz gidiş-dönüş arama. **Skyscanner her zaman #1**.  
Kaynaklar: onaylı OTAlar + **Türkiye’ye/Türkiye’den uçan ~111 havayolu**.  
**Ücretli API anahtarı gerekmez.** CAPTCHA bypass / credential stuffing yok.

## Ürün özeti

Kullanıcı kalkış (varsayılan İstanbul), varış, tarih aralığı, **konaklama 2–21 gün (çoklu)** ve isteğe bağlı **“yalnızca aktarmasız”** filtresi verir. Sistem tarih çiftlerini üretir; her (kaynak × tarih) için deep-link + mümkünse ücretsiz fiyat önizlemesi gösterir.

## Ücretsiz strateji

| Yaklaşım | Durum |
|----------|--------|
| Deep-link çoklu kaynak (OTA + TR-operating airlines) | **Birincil** |
| Google Flights public best-effort fiyat önizleme | **İkincil** (`mode: preview`, CAPTCHA bypass yok) |
| Sahte / demo fiyat | **Yok** |
| Ücretli Skyscanner / Kiwi / Amadeus | İsteğe bağlı bonus |
| CAPTCHA bypass / brittle exploit scraper | **Yasak** |

### Akış

1. `expandDatePairs` → (gidiş, dönüş) çiftleri (örnekleme ~20)  
2. `ResultRow` = kaynak × tarih; kendi tarihleri korunur  
3. `nonstopOnly` → deep-link’lere `stops=0` / `preferdirects` / eşdeğeri  
4. Aktarma sütunu: filtre açıksa **Aktarmasız**; kapalıysa **Aktarmasız / aktarmalı** (bilinmiyor son çare)  
5. **Sıralama:** fiyat **ucuz → pahalı** (birincil); fiyatsız (link-only) satırlar sonda; eşit fiyatta kaynak önceliği (Skyscanner #1) kıran. Kaynak başına özet de aynı kural (`sort-results.ts`).  
6. Fiyat: önizleme varsa TRY sayı; yoksa **Sitede gör**  

### Veri modeli (özet)

```ts
type ResultRow = {
  source: string; sourcePriority: number;
  outboundDate: string; returnDate: string; stayDays: number;
  stops: "nonstop" | "connecting" | "unknown";
  stopCount: number | null;
  price: number | null; // null → “Sitede gör”
  purchaseUrl: string; mode: "live" | "link-out" | "preview" | "demo";
};
```

### Havalimanı

- OurAirports → ~5328 IATA; `AirportPicker` aramalı combobox  
- Seçim: `onMouseDown` + `preventDefault` (blur/click yarışı düzeltmesi)  
- Çoklu havalimanı şehirler: IST / SAW ayrı  

### Aktarmasız filtresi

- Form: “Yalnızca aktarmasız” checkbox → `SearchRequest.nonstopOnly`  
- Deep-link: Skyscanner `preferdirects`+`stops=0`, Kayak `fs=stops=0`, Kiwi `stopNumber=0`, GF `tt:o`, vb.  
- Sonuç tablosu **Aktarma** sütunu her satırda görünür  

### Kaynaklar

1. Skyscanner (TR) — #1  
2–14. Enuygun, Kayak, Google Flights, Turna, Ucuzabilet, Biletall, Obilet, Kiwi, Momondo, Expedia, Booking, Trip.com, eDreams  
15+. `src/data/tr-airlines.json` — THY, Pegasus, AJet, SunExpress, Corendon, Lufthansa, Qatar, Emirates, Wizz, AF, KLM, … (~111)

## Konaklama

- 2…21 gün dahil, çoklu seçim; varsayılan `[3,4]`

## Çalıştırma

```bash
cd ucuz-ucak-bileti && npm install && npm run build && npm start
# CLI: npm run search -- --from IST --to AMS --start 2026-04-01 --end 2026-06-01 --stay 3,4 --nonstop
```

Store kopyası: `/cursor/stores/bc-946a5cbe-da64-4be2-ae4f-ccd2e255277f/docs/flight-search-plan.md`
