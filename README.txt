MASTER Nutrisyon PWA v6.0 — Veri-bağımsız mimari

ANA PRENSİP
PWA uygulama kodu ile ürün veritabanı artık ayrı sürümlenir.

Uygulama:
- index.html
- manifest.webmanifest
- sw.js
- ikonlar

Ürün verisi:
- data/products.xlsx  : insanlar için ana/master veritabanı
- data/products.json  : PWA'nın okuduğu çalışma verisi
- data/version.json   : veritabanı sürümü, tarih ve ürün sayıları

İLK DEPLOYMENT
1. ZIP içindeki tüm dosya ve klasörleri repository köküne yükleyin.
2. GitHub Pages'i main / root üzerinden yayınlayın.
3. .github/workflows/build-products.yml dosyasının repository'de bulunduğunu doğrulayın.
4. Actions çalıştırma yetkisi açık olmalıdır. Workflow, permissions: contents: write kullanır.

SONRAKİ ÜRÜN GÜNCELLEMELERİ
PWA kodunu değiştirmeyin.
Yalnız data/products.xlsx dosyasını yeni doğrulanmış sürümle değiştirin.
GitHub Actions otomatik olarak:
- products.xlsx dosyasını okur,
- erişkin enteral ürünleri çıkarır,
- yalnız 'Geçerli ruhsat' PN satırlarını aktif listeye alır,
- products.json üretir,
- version.json tarih ve sayımlarını günceller,
- generated JSON dosyalarını repository'ye commit eder.

PWA DAVRANIŞI
- products.json ve version.json için network-first kullanır.
- İnternet varsa en güncel veriyi alır.
- İnternet yoksa en son başarılı veri önbelleğini kullanır.
- Veri güncellemesi PWA sürümünü değiştirmez.
- Klinik algoritma değişirse ancak o zaman PWA kod sürümü değiştirilir.

KAPSAM KONTROLLERİ
build-products.mjs şu kayıtları veri üretiminde reddeder:
- Fresenius / Fresenius Kabi
- Kabiven / SmofKabiven
- tanımlı pediyatrik ürün adları

Klinik not:
Ürün veritabanı güncellemesi klinik karar algoritmasından bağımsızdır. Yeni ürün verileri yayımlanmadan önce kaynak ve KÜB doğrulaması korunmalıdır.
