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
| **AJet** | partial | Doğrudan fare API yok; **VF+VF RT · ENUYGUN** doğrulanmış |
| **Pegasus** | partial | Takvim 403; **PC+PC RT · ENUYGUN** doğrulanmış |
| **Turkish Airlines** | partial/inaccessible | NDC partner; OW+OW yok; örnek aramada TK+TK yok |
| SunExpress / Corendon | inaccessible | Cloudflare; sezona bağlı ENUYGUN XQ/XC |
| **Skyscanner TR** | inaccessible | Partner key / CAPTCHA; hard-dep değil |

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
