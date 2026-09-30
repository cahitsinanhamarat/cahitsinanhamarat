# Ucuz Uçak Bileti

Türkiye çıkışlı **gidiş-dönüş** uçuşlarda doğrulanmış toplam fiyat karşılaştırması.

- Uydurma / demo fiyat **yok**
- CAPTCHA bypass / exploit scraping **yok**
- Sonuçlar kaynak önceliğine göre değil, **RT toplam fiyata** göre ucuz→pahalı
- Koşullu indirimler (üyelik/banka/uygulama/kupon) standart fiyattan **ayrı** etiketlenir

## Çalışan kaynak (v1)

| Kaynak | Durum | Not |
|--------|--------|-----|
| **ENUYGUN** | working | Resmi MCP `https://mcp.enuygun.com/mcp` — gerçek TRY fiyat, saat, bagaj, rezervasyon linki |
| Pegasus | partial | Port/status ok; takvim/fiyat POST Akamai 403 (bu ortam) |
| AJet | inaccessible | Site timeout; partner API anahtarı yok. ENUYGUN’da VF teklifleri görünür |

Araştırma raporu: proje store `docs/flight-sources-research.md`

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
