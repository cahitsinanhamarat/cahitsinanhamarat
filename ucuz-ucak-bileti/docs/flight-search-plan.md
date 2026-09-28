# Ucuz Uçak Bileti — Arama Mimarisi ve Kaynak Stratejisi

Türkiye çıkışlı ucuz gidiş-dönüş uçuşları için onaylı 19 kaynaklı arama ürünü planı. Skyscanner her zaman birinci önceliktir.

## Ürün özeti

Kullanıcı İstanbul (veya başka kalkış) seçer, varış şehri, tarih aralığı (ör. 1 Nis – 1 Haz) ve konaklama süresi (çoklu seçim: 3 ve/veya 4 gün) verir. Sistem aralık + süre kombinasyonlarına uyan gidiş-dönüş seçeneklerini tarar, en ucuzu üstte gösterir; fiyat, saatler, havayolu ve satın alma linkleri listelenir. Alternatifler fiyat sırasıyla altta yer alır. Arayüz Türkçe’dir.

## Mimari

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Türkçe UI      │────▶│  /api/search         │────▶│  Source adapters    │
│  (Next.js)      │     │  (tarih genişletme,  │     │  Amadeus / Kiwi /    │
│                 │◀────│   birleştir, sırala) │◀────│  Skyscanner / mock  │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
                                    │
                                    ▼
                         Deep-link üreticileri
                         (API’siz 15+ kaynak)
```

- **Frontend:** Next.js App Router, tek sayfa arama formu + sonuç listesi (Türkçe).
- **Backend:** `POST /api/search` — tarih aralığını konaklama sürelerine göre (gidiş, dönüş) çiftlerine açar; canlı API adaptörlerini paralel çağırır; deep-link sonuçlarını ekler; birleşik listeyi fiyata göre sıralar.
- **Demo / mock:** API anahtarı yoksa gerçekçi örnek sonuçlar üretilir; UX demolanabilir kalır.
- **Repo konumu:** `/workspace/ucuz-ucak-bileti/` (profil README deposunu bozmamak için alt klasör).

### Tarih genişletme

Verilen `[startDate, endDate]` ve `stayDays[]` için:

- Her `stay` ∈ stayDays için: her geçerli `departure` tarihinden `return = departure + stay` üretilir; `return ≤ endDate`.
- Canlı API çağrıları maliyet/rate-limit için üst sınırlıdır (ör. en fazla ~40 tarih çifti; aşılırsa eşit aralıklı örnekleme).
- Deep-link kaynakları için tipik/en erken uygun tarih çifti veya kullanıcıya aralıklı arama URL’leri üretilir.

### Sonuç modeli

```ts
type FlightOffer = {
  id: string;
  source: string;           // "Skyscanner" | "Amadeus" | ...
  sourcePriority: number;   // Skyscanner = 1
  price: number | null;     // TRY; null = link-out only
  currency: "TRY";
  airline: string;
  outbound: { departure: string; arrival: string; from: string; to: string };
  inbound:  { departure: string; arrival: string; from: string; to: string };
  stayDays: number;
  purchaseUrl: string;
  mode: "live" | "link-out" | "demo";
};
```

Sıralama: önce `price != null` artan; eşitlikte `sourcePriority` (Skyscanner öncelikli); link-out’lar canlı fiyatların altında, kendi içinde önceliğe göre.

## Kaynak stratejisi (19 site)

| # | Kaynak | Strateji | Mod |
|---|--------|----------|-----|
| 1 | **Skyscanner (TR)** | RapidAPI Skyscanner veya affiliate deep-link (`skyscanner.com.tr`); anahtar varsa canlı fiyat, yoksa TR deep-link | live / link-out |
| 2 | Enuygun | Resmi partner API yok → `enuygun.com` gidiş-dönüş deep-link | link-out |
| 3 | Kayak (TR) | Deep-link `kayak.com.tr` | link-out |
| 4 | Google Flights | Deep-link (GF özel encoding / `google.com/travel/flights`) | link-out |
| 5 | Turna | Deep-link `turna.com` | link-out |
| 6 | Ucuzabilet | Deep-link `ucuzabilet.com` | link-out |
| 7 | Biletall | Deep-link `biletall.com` | link-out |
| 8 | Obilet (uçuş) | Deep-link `obilet.com` uçuş arama | link-out |
| 9 | Kiwi.com | Tequila API (`KIWI_API_KEY`) canlı; yoksa kiwi.com deep-link | live / link-out |
| 10 | Momondo | Deep-link `momondo.com` | link-out |
| 11 | Turkish Airlines | Deep-link `turkishairlines.com` | link-out |
| 12 | Pegasus | Deep-link `flypgs.com` | link-out |
| 13 | AJet | Deep-link `ajet.com` | link-out |
| 14 | SunExpress | Deep-link `sunexpress.com` | link-out |
| 15 | Corendon Airlines | Deep-link `corendonairlines.com` | link-out |
| 16 | Expedia | Deep-link `expedia.com` flights | link-out |
| 17 | Booking.com Flights | Deep-link Booking flights | link-out |
| 18 | Trip.com | Deep-link `trip.com` | link-out |
| 19 | eDreams | Deep-link `edreams.com` | link-out |

**Çapraz canlı fiyat (meta):** Amadeus Self-Service Flight Offers (`AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET`) birçok taşıyıcıyı tek çağrıda döndürür. Sonuçlar “Amadeus (meta)” olarak etiketlenir; onaylı 19’un yerine geçmez, ek canlı fiyat katmanı olarak UI’da gösterilir. Amadeus yoksa demo mock kullanır.

Kasıtlı olarak **yapılmayanlar:** ToS ihlali scrapers, CAPTCHA bypass, exploit tarzı otomasyon.

## UX (Türkçe)

1. **Hero:** Marka “Ucuz Uçak Bileti”, tek kısa slogan, arama formu (kalkış, varış, tarih aralığı, konaklama süresi çoklu seçim, Ara).
2. **Sonuçlar:** En ucuz öne çıkar; kartlarda fiyat (veya “Fiyat için siteye git”), gidiş/dönüş saatleri, havayolu, kaynak rozeti, “Satın al” linki.
3. **Kaynak durumu:** Canlı / link-out / demo rozetleri; altta hangi kaynakların canlı olduğu açıklanır.
4. **Boş / hata:** Türkçe mesajlar; anahtar eksikse demo modu açıkça belirtilir.

## Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `AMADEUS_CLIENT_ID` | Hayır | Amadeus Self-Service client id |
| `AMADEUS_CLIENT_SECRET` | Hayır | Amadeus secret |
| `KIWI_API_KEY` | Hayır | Kiwi Tequila API key |
| `SKYSCANNER_RAPIDAPI_KEY` | Hayır | RapidAPI üzerinden Skyscanner |
| `SKYSCANNER_RAPIDAPI_HOST` | Hayır | Varsayılan RapidAPI host |
| `DEMO_MODE` | Hayır | `force` = her zaman mock; yoksa anahtar yoksa otomatik demo |
| `NEXT_PUBLIC_DEFAULT_ORIGIN` | Hayır | Varsayılan kalkış (IST) |

`.env.example` uygulama klasöründe bulunur. Anahtar yoksa uygulama **demo modunda** çalışır.

## Güvenlik ve uyumluluk

- Sadece resmi/partner API’ler ve kullanıcıya açık deep-link URL’leri.
- Rate limit ve timeout (ör. 12s / kaynak); kısmi başarısızlıkta diğer kaynaklar devam eder.
- Fiyatlar bilgilendirme amaçlıdır; nihai fiyat satın alma sitesinde geçerlidir.
- README canlı vs link-out ayrımını açıkça yazar.

## Teslimatlar

| Teslimat | Yol |
|----------|-----|
| Bu plan | `docs/flight-search-plan.md` (Project store) |
| Uygulama | `/workspace/ucuz-ucak-bileti/` |
| README | `/workspace/ucuz-ucak-bileti/README.md` |

## Sonraki adımlar (ürün sonrası)

- Affiliate program kayıtları (Skyscanner, Kayak, Enuygun partner) ile deep-link’lere tracking parametresi.
- Kullanıcı hesabı / fiyat alarmı (e-posta).
- Daha fazla IATA şehir sözlüğü ve çoklu havalimanı (IST+SAW) grupları.
