# Ucuz Uçak Bileti

Türkiye çıkışlı **gidiş-dönüş** uçuşlarda doğrulanmış toplam fiyat karşılaştırması.

- Uydurma / demo fiyat **yok**
- CAPTCHA bypass / exploit scraping **yok**
- Sonuçlar kaynak önceliğine göre değil, **RT toplam fiyata** göre ucuz→pahalı
- Koşullu indirimler (üyelik/banka/uygulama/kupon) standart fiyattan **ayrı** etiketlenir
- AJet & THY sonuçlarda ayrıca vurgulanır (aynı RT oturumundan VF+VF / TK+TK; OW+OW yok)

## Kaynak durumu (v1)

| Kaynak | Durum | Not |
|--------|--------|-----|
| **ENUYGUN** | working | Resmi MCP — gerçek TRY (yurt içi + yurt dışı) |
| **AJet** | partial | Doğrudan fare API yok; **VF+VF RT · ENUYGUN** doğrulanmış |
| **Turkish Airlines** | partial | NDC partner yok; **TK+TK RT · ENUYGUN** (`thy_ndc`); OW+OW yok |
| **Pegasus** | partial | Takvim 403; **PC+PC RT · ENUYGUN** doğrulanmış |
| **SunExpress** | partial | Cloudflare doğrudan; **XQ+XQ · ENUYGUN** (AYT hub) |
| Corendon | inaccessible | Cloudflare; sezona bağlı XC+XC |
| **Skyscanner TR** | inaccessible | Partner key / CAPTCHA; hard-dep değil |
| Turna / Obilet / Google / Kayak | inaccessible veya partial | Fiyat API yok / engel |

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

Deep-link-only sonuçlar “tamamlanmış fiyat entegrasyonu” sayılmaz. Havayolu satırları `Havayolu · ENUYGUN` etiketiyle OTA üzerinden doğrulanmış RT fiyatıdır.
