# Ucuz Uçak Bileti — Arama Planı (ücretsiz yol)

Türkiye çıkışlı ucuz gidiş-dönüş arama. Onaylı **19 kaynak**; **Skyscanner her zaman #1**.  
**Ücretli API anahtarı gerekmez.** Scraping / CAPTCHA bypass / ToS kaçınma yok.

## Ürün özeti

Kullanıcı kalkış (varsayılan İstanbul), varış, tarih aralığı ve **konaklama süresi 2–21 gün (çoklu seçim)** verir. Sistem aralık + süreye uyan tüm gidiş-dönüş tarih çiftlerini üretir. Her çift için 19 onaylı kaynağa hazır satın alma / arama deep-link’i sunulur (Skyscanner birincil CTA). Gerçek fiyat her zaman kaynak sitesinde görülür.

## Ücretsiz strateji (ship edilen yol)

| Yaklaşım | Durum |
|----------|--------|
| Deep-link çoklu kaynak karşılaştırma | **Birincil ürün** |
| Sahte / demo fiyat ile “en ucuz” yanılsaması | **Kaldırıldı** (dürüst etiketleme) |
| Ücretli Skyscanner / Kiwi / Amadeus | **Gerekmez**; isteğe bağlı bonus (anahtar varsa) |
| CAPTCHA bypass / brittle scraper | **Yasak** |
| Ücretsiz sandbox kaydı (kredi kartı yok) | Bu VM’de kullanıcı e-postası olmadan credential alınamadı; ürüne bağlı değil |

### Akış

1. `expandDatePairs(start, end, stayDays[2…21])` → geçerli (gidiş, dönüş) çiftleri  
2. Çok fazla çiftte eşit aralıklı örnekleme (üst sınır ~150; `tripOptionsTotal` gerçek sayıyı söyler)  
3. Her çift → `TripOption` + 19 `SourceLink` (priority sırası, Skyscanner = 1)  
4. Sıralama: canlı fiyat sinyali varsa ucuzdan pahalıya; yoksa kronolojik  
5. UI: tarih kartı → “Skyscanner’da aç” + diğer kaynak chip’leri / genişletilebilir liste  

### Mimari

```
Türkçe UI  →  POST /api/search  →  tarih genişletme + deep-link üreticileri
                GET /api/status     (strategy: free-deep-link-compare)
                CLI: npm run search
```

## Konaklama süresi

- Seçenekler: **2, 3, 4, …, 21** (dahil), çoklu seçim  
- Varsayılan: `[3, 4]`  
- Preset: 3+4, 1 hafta, tümü, temizle  
- API / CLI: `normalizeStayDays` ile 2–21 dışındakiler elenir  

## 19 kaynak (hepsi link-out / ücretsiz)

Hepsi deep-link; canlı fiyat API’si zorunlu değil.

1. Skyscanner (TR) — birincil CTA  
2. Enuygun  
3. Kayak (TR)  
4. Google Flights  
5. Turna  
6. Ucuzabilet  
7. Biletall  
8. Obilet (uçuş)  
9. Kiwi.com  
10. Momondo  
11. Turkish Airlines  
12. Pegasus  
13. AJet  
14. SunExpress  
15. Corendon Airlines  
16. Expedia  
17. Booking.com Flights  
18. Trip.com  
19. eDreams  

İsteğe bağlı (ücretli, kullanıcı isterse): RapidAPI Skyscanner, Kiwi Tequila, Amadeus — ürün bunlara bağlı değildir.

## Ortam değişkenleri

Ücretsiz yol için **hiçbiri zorunlu değil**.  
`.env.example` yalnızca isteğe bağlı bonus anahtarları listeler.

## Repo

`/workspace/ucuz-ucak-bileti/` — Next.js App Router, Türkçe UI + CLI.
