# Dünya Mutfağı

Mustafa Çakmak (254309252) – Mesleki Çözümleme I dönem projesi.

10 ülkenin mutfağından hikâyeli tarifler sunan bir tarif sitesi. Site tek bir HTML dosyasından oluşur (`index.html`); kurulum veya derleme gerektirmez.

## Özellikler
- 32 özel tarif: malzemeler, adım adım yapılış, hikâye, "Nerede yenir?", diyet ve alerji bilgisi
- TheMealDB entegrasyonu: TheMealDB'deki tüm tarifler sitenin listesine eklenir (süre, zorluk, alerji ve diyet bilgisi otomatik çıkarılır)
- Pişirme modu, zamanlayıcı, sesli okuma
- Şef: soru-cevap ve sesli sohbet asistanı (15 dilde ses)
- İki aşamalı yemek çarkı, arama önerileri, "Elimde ne var?"
- Hesap sistemi, favoriler, notlar, rozetler
- 19 tema, Türkçe/İngilizce

## Dosyalar
- `index.html` – sitenin güncel sürümü (Vercel bu dosyayı yayınlar)
- `dunya-mutfagi MUSTAFA ÇAKMAK 3 HAFTA.html`, `dunya-mutfagi MUSTAFA ÇAKMAK 4 HAFTA.html` – haftalık teslim sürümleri
- `4. Hafta Rapor/` – 4. hafta laboratuvar raporu (PDF, Word) ve ER diyagramı
- `5. Hafta Rapor/` – 5. hafta veri tabanı raporu (PDF, Word)
- `veritabani/` – SQLite veritabanı: şema, kurulum betiği (`node seed.js`), örnek sorgular ve hazır `dunya_mutfagi.db`

## Yayına alma (Vercel)
Depo Vercel'deki **dunya-mutfagi** projesine bağlıdır; `main` dalına yapılan her gönderim siteyi otomatik günceller: https://dunya-mutfagi.vercel.app

Yayın sırasında `build.js` çalışır (`vercel.json`): TheMealDB'deki tüm tarifleri çekip `index.html`'in içine gömer ve sonucu `dist/` klasörüne yazar. Böylece yayındaki sitede bütün tarifler, diğer tarifler gibi sayfanın içinde hazır gelir. TheMealDB'ye ulaşılamazsa site eski davranışla tarifleri tarayıcıda canlı çeker. Yerelde denemek için: `node build.js`.

Tarif verileri: [TheMealDB](https://www.themealdb.com) (ücretsiz test anahtarı, eğitim amaçlı kullanım).
