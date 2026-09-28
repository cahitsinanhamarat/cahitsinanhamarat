# Ucuz Uçak Bileti

Türkiye çıkışlı gidiş-dönüş tarih tarayıcı + **19 kaynak deep-link karşılaştırma**.  
**Skyscanner birinci.** **Ücretli API anahtarı gerekmez.**

## Hızlı başlangıç

```bash
cd ucuz-ucak-bileti
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

### CLI

```bash
npm run search -- --from IST --to AMS --start 2026-04-01 --end 2026-06-01 --stay 3,4
# stay: 2–21, virgülle çoklu (örn. 2,5,7 veya 3,4)
```

## Ücretsiz yol (ship edilen)

1. Kalkış / varış / tarih aralığı / **konaklama 2–21 gün (çoklu)**  
2. Tüm geçerli gidiş–dönüş çiftleri üretilir  
3. Her çift için 19 onaylı siteye arama linki (Skyscanner CTA)  
4. Canlı ücretli fiyat API’si yok → kronolojik liste; gerçek fiyat kaynak sitesinde  
5. Scraping / CAPTCHA bypass yok  

Sahte “demo fiyat” ile sıralama **yoktur** — dürüst deep-link ürünüdür.

## Konaklama süresi

- UI + API + CLI: **2…21 gün dahil**, çoklu seçim  
- Varsayılan: 3 ve 4 gün  

## Kaynaklar

19 kaynağın tamamı **ücretsiz link-out**. Detay: `docs/flight-search-plan.md`.

İsteğe bağlı (zorunlu değil) ücretli anahtarlar `.env.example` içinde; ürün bunlara bağımlı değildir.

## Scriptler

| Komut | Açıklama |
|-------|---------|
| `npm run dev` | Geliştirme |
| `npm run build` / `start` | Production |
| `npm run search` | CLI |
| `npm run lint` | `tsc --noEmit` |
