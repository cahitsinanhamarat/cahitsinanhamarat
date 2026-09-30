# Ucuz Uçak Bileti

Türkiye çıkışlı **gidiş-dönüş** uçuşlarda doğrulanmış toplam fiyat karşılaştırması.

- Uydurma / demo fiyat **yok**
- CAPTCHA bypass / exploit scraping **yok**
- Sonuçlar kaynak önceliğine göre değil, **RT toplam fiyata** göre ucuz→pahalı
- Koşullu indirimler (üyelik/banka/uygulama/kupon) standart fiyattan **ayrı** etiketlenir

## Çalışan kaynak (v1)

| Kaynak | Durum | Not |
|--------|--------|-----|
| **ENUYGUN** | working | Resmi MCP — gerçek TRY (yurt içi + yurt dışı) |
| **Skyscanner TR** | inaccessible | Partner API key yok (401); curl CAPTCHA; link-only ≠ verified. `SKYSCANNER_API_KEY` yolu hazır |
| Pegasus | partial | Port/status OK; takvim/fiyat POST Akamai 403 |
| AJet | inaccessible | Site timeout; ENUYGUN’da VF görünür |

**Havalimanları:** ~3200+ IATA + “tüm havalimanları” şehir grupları (ISTA, LON, PAR, NYC, …).

Araştırma: proje store `docs/flight-sources-research.md`

## Çalıştırma

```bash
cd ucuz-ucak-bileti
npm install
npm run dev
# http://localhost:3000
```

Üretim:

```bash
npm run build && npm start
```

## API

- `POST /api/search` — `{ origin, destination, earliest, latest, minStayDays, maxStayDays, adults?, maxDatePairs? }`
- `GET /api/status` — kaynak durumları

## Notlar

Deep-link-only sonuçlar “tamamlanmış fiyat entegrasyonu” sayılmaz. ENUYGUN MCP canlı fiyat okur; Pegasus/AJet doğrudan fiyatı bu ortamda doğrulanamadı — sonraki iterasyonlarda eklenecek.
