# Ucuz Uçak Bileti

Türkiye çıkışlı ucuz gidiş-dönüş uçak bileti arama uygulaması. Onaylı **19 kaynak**; **Skyscanner birinci öncelik**. Arayüz Türkçe.

## Hızlı başlangıç

```bash
cd ucuz-ucak-bileti
npm install
npm run dev
```

Tarayıcı: [http://localhost:3000](http://localhost:3000)

API anahtarı olmadan da çalışır (**demo modu**): örnek fiyatlar + tüm kaynaklara gerçek deep-link’ler.

### CLI

```bash
npm run search -- --from IST --to AMS --start 2026-04-01 --end 2026-06-01 --stay 3,4
```

## Ne yapar?

1. Kalkış (varsayılan İstanbul / IST) ve varış seçin  
2. Tarih aralığı verin (ör. 1 Nis – 1 Haz)  
3. Konaklama süresini çoklu seçin (ör. 3 ve 4 gün)  
4. Sistem aralık + süreye uyan gidiş-dönüşleri tarar  
5. En ucuz üstte; fiyat, saatler, havayolu, satın alma linki  
6. Diğer alternatifler fiyat sırasıyla altta; API’siz siteler link-out

## Kaynak durumu (19)

| # | Kaynak | Anahtarsız | Anahtarla |
|---|--------|------------|-----------|
| 1 | **Skyscanner (TR)** | link-out (+ demo fiyat) | `SKYSCANNER_RAPIDAPI_KEY` → canlı |
| 2 | Enuygun | link-out | — |
| 3 | Kayak (TR) | link-out | — |
| 4 | Google Flights | link-out | — |
| 5 | Turna | link-out | — |
| 6 | Ucuzabilet | link-out | — |
| 7 | Biletall | link-out | — |
| 8 | Obilet (uçuş) | link-out | — |
| 9 | Kiwi.com | link-out (+ demo) | `KIWI_API_KEY` → canlı |
| 10 | Momondo | link-out | — |
| 11 | Turkish Airlines | link-out | — |
| 12 | Pegasus | link-out | — |
| 13 | AJet | link-out | — |
| 14 | SunExpress | link-out | — |
| 15 | Corendon Airlines | link-out | — |
| 16 | Expedia | link-out | — |
| 17 | Booking.com Flights | link-out | — |
| 18 | Trip.com | link-out | — |
| 19 | eDreams | link-out | — |

**Ek meta katman:** Amadeus Self-Service (`AMADEUS_CLIENT_ID` + `AMADEUS_CLIENT_SECRET`) birçok taşıyıcıdan canlı fiyat döndürebilir; sonuçlar “Amadeus (meta)” diye etiketlenir. Onaylı 19’un yerine geçmez.

> Dürüst uyarı: Çoğu TR metasearch/OTA’nın genel erişilebilir uçuş API’si yoktur. Bu yüzden canlı fiyat yalnızca API anahtarı verilen kaynaklarda (ve Amadeus meta’da) gelir; diğerleri **link-out only** (kullanıcıyı sitenin arama URL’sine yönlendirir). Scraping, CAPTCHA bypass veya ToS kaçınma **yoktur**.

### Anahtarsız (varsayılan) özet

- **Canlı fiyat:** yok  
- **Demo fiyat:** Skyscanner / Kiwi / Enuygun / Kayak görünümünde örnek TRY  
- **Link-out:** 19 kaynağın tamamı (demo’da fiyatlı olanlar hariç tekrar listelenenler + diğerleri)

### Anahtarlı olası canlı kaynaklar

1. Skyscanner (RapidAPI)  
2. Kiwi.com (Tequila)  
3. Amadeus meta (ek)

## API anahtarları

```bash
cp .env.example .env.local
```

| Değişken | Nereden |
|----------|---------|
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` | [Amadeus for Developers](https://developers.amadeus.com/) |
| `KIWI_API_KEY` | [Kiwi Tequila](https://tequila.kiwi.com/) |
| `SKYSCANNER_RAPIDAPI_KEY` | RapidAPI’de Skyscanner provider |
| `SKYSCANNER_RAPIDAPI_HOST` | Provider host (ör. `sky-scanner3.p.rapidapi.com`) |
| `DEMO_MODE=force` | Her zaman demo |

## Mimari

- `src/app` — Türkçe UI (Next.js App Router)  
- `src/app/api/search` — tarih genişletme + adaptör orkestrasyonu  
- `src/lib/adapters` — Amadeus, Kiwi, Skyscanner, mock  
- `src/lib/deep-links.ts` — 19 kaynak deep-link  
- `scripts/search-cli.ts` — terminal arama  

Detaylı plan: Project store `docs/flight-search-plan.md`.

## Scriptler

| Komut | Açıklama |
|-------|---------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build |
| `npm run start` | Production sunucu |
| `npm run search` | CLI arama |
| `npm run lint` | ESLint |

## Lisans

Kişisel / demo kullanım. Nihai fiyat ve müsaitlik ilgili satıcı sitesinde geçerlidir.
