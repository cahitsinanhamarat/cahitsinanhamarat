# Ucuz Uçak Bileti — Arama Planı (ücretsiz, dürüst)

Türkiye çıkışlı gidiş-dönüş arama. **Skyscanner #1.**  
**Ücretli API yok. Uydurma / önizleme / demo TRY fiyatı yok.**  
Fiyat sütunu: **Sitede gör** (yanlış sayı göstermektense boş).

## Fiyat davranışı

| Durum | Davranış |
|-------|----------|
| Ücretsiz deep-link yolu (varsayılan) | `price: null` → UI **Sitede gör** |
| Puppeteer / Google Flights “önizleme” | **Kaldırıldı** (yanlış sayılar üretiyordu) |
| Demo / mock TRY | **Kullanılmıyor** |
| Partner API anahtarı (isteğe bağlı) | Yoksa hiç yok; varsa ileride gerçek `live` |

## Çalışan kaynaklar (aktif)

HTTP denetimi + bilinen arama URL şeması. Kırık şablonlar listeden çıkarıldı.

### OTA (9)

1. Skyscanner (TR) — `#1`
2. Kayak (TR)
3. Google Flights
4. Kiwi.com
5. Momondo
6. Trip.com
7. Booking.com Flights
8. eDreams
9. Expedia

### Havayolu (20) — Skyscanner `airlines=` filtresi

Kendi sitelerindeki uydurma `?origin=` şablonları çoğunlukla 404/403 idi.  
Aktif liste: her taşıyıcı için **çalışan Skyscanner araması + airline filtresi**.

TK, PC, VF, XQ, XC, W6, FR, A3, LH, LX, OS, AF, KL, BA, QR, EK, EY, EW, U2, LO

### Kaldırılan / pasif

- Enuygun, Turna, Ucuzabilet, Biletall, Obilet — bot 403 veya doğrulanmamış uçuş deep-link  
- ~90+ eski airline-site şablonu — 404/403/ana sayfa; varsayılan sonuçlarda yok  

## Diğer ürün kuralları

- Havalimanı: OurAirports + `AirportPicker` (`onMouseDown` seçim düzeltmesi)  
- **Çoklu havalimanı şehir:** örn. İstanbul → “İstanbul (tüm havalimanları)” (`CITY:TR:istanbul` = IST+SAW). Skyscanner `ista` / Kayak `IST,SAW`; multi desteklemeyen kaynaklarda üye IATA’lara genişletme veya birincil kod.  
- Konaklama: 2–21 gün çoklu  
- Aktarmasız toggle + Aktarma sütunu  
- Sıralama: fiyat ucuz→pahalı (fiyat yoksa kaynak önceliği); fiyatsız sonda  

## Çalıştırma

```bash
cd ucuz-ucak-bileti && npm install && npm run build && npm start
```

Store: `/cursor/stores/bc-946a5cbe-da64-4be2-ae4f-ccd2e255277f/docs/flight-search-plan.md`
